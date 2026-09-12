import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// `import.meta.url` n'est pas un chemin de fichier sous Vitest : les modules
// passent par le serveur de Vite, son URL est en http. On part du dossier de
// travail, qui est celui du paquet.
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

/**
 * Les métriques de repli n'ont aucune expression en JSX : rien d'autre que
 * `index.css` ne les porte, et rien ne signalerait leur disparition. Sans
 * elles, la page saute au moment du `swap` — la police locale est plus large et
 * moins haute que la police finale (mesuré au navigateur : +14,3 % de largeur
 * et −6,2 % de hauteur de ligne sur Cormorant contre Georgia), donc le texte se
 * replie autrement et tout ce qui suit se déplace sous les yeux de l'invité.
 */
const familles = [
  { webfont: "Cormorant Garamond", repli: "Cormorant Garamond Fallback", jeton: "--font-display" },
  { webfont: "Jost", repli: "Jost Fallback", jeton: "--font-sans" },
  { webfont: "Parisienne", repli: "Parisienne Fallback", jeton: "--font-script" },
] as const;

/** Le corps de la règle `@font-face` qui déclare cette famille. */
function faceDuRepli(nom: string): string {
  const bloc = css
    .split("@font-face")
    .map((morceau) => morceau.slice(0, morceau.indexOf("}")))
    .find((corps) => corps.includes(`font-family: "${nom}";`));
  expect(bloc, `aucun @font-face ne déclare "${nom}"`).toBeDefined();
  return bloc as string;
}

/** La valeur d'un jeton, repliée sur une seule ligne. */
function jetonNormalise(jeton: string): string {
  const depuisLeJeton = css.slice(css.indexOf(`${jeton}:`));
  expect(depuisLeJeton, `${jeton} est introuvable`).not.toHaveLength(0);
  return depuisLeJeton
    .slice(jeton.length + 1, depuisLeJeton.indexOf(";"))
    .replace(/\s+/g, " ")
    .trim();
}

describe("index.css — les métriques de repli", () => {
  it.each(familles)("$repli porte les quatre réglages mesurés", ({ repli }) => {
    const face = faceDuRepli(repli);
    for (const reglage of [
      "size-adjust",
      "ascent-override",
      "descent-override",
      "line-gap-override",
    ]) {
      expect(face, `${repli} ne règle pas ${reglage}`).toContain(`${reglage}: `);
    }
  });

  // Une `url()` ici téléchargerait une seconde police pour couvrir l'attente de
  // la première : le repli ne vaut que s'il est déjà sur la machine.
  it.each(familles)("$repli ne s'appuie que sur des polices locales", ({ repli }) => {
    const src = faceDuRepli(repli)
      .split("\n")
      .find((ligne) => ligne.includes("src:"));
    expect(src).toBeDefined();
    expect(src).toContain("local(");
    expect(src).not.toContain("url(");
  });

  // Le piège : la face existe, personne ne la nomme, et elle ne sert jamais.
  it.each(familles)("$jeton nomme $repli juste après la webfont", ({ webfont, repli, jeton }) => {
    expect(jetonNormalise(jeton)).toContain(`"${webfont}", "${repli}"`);
  });
});
