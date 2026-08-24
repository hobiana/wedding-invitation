import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HemMotif } from "./HemMotif";

function markup() {
  const { container } = render(<HemMotif />);
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("aucun <svg> rendu");
  return svg;
}

describe("HemMotif", () => {
  // C'est un ornement, pas une information. Un lecteur d'écran qui l'annonce
  // interrompt la lecture des prénoms pour rien.
  it("is hidden from assistive technology and unreachable by keyboard", () => {
    const svg = markup();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  // §1.5.d : « la partie signifiante du motif ne repose jamais sur l'or ».
  // L'or mesure 3,58:1 sur ivoire — il tient un filet, jamais un signe.
  it("draws the stem in gold and the flower in bordeaux", () => {
    const svg = markup();
    const strokes = [...svg.querySelectorAll("[stroke]")].map((n) => n.getAttribute("stroke"));
    expect(strokes).toContain("var(--color-gold)");
    expect(strokes).toContain("var(--color-bordeaux-700)");
  });

  // Le motif de la robe est un tracé au fil d'épaisseur constante, pas une
  // broderie pleine : un remplissage en ferait une autre broderie.
  it("is a constant-width outline, never a filled shape", () => {
    const svg = markup();
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke-width", "1.25");

    // Le seul aplat toléré est le cœur de la fleur, relevé plein sur la robe —
    // et il est en bordeaux, jamais en or.
    const filled = [...svg.querySelectorAll("[fill]")]
      .map((n) => n.getAttribute("fill"))
      .filter((f) => f !== "none");
    expect(filled).toEqual(["var(--color-bordeaux-700)"]);
  });

  // Cible du §1.5.d. Le motif est en ligne dans le HTML de chaque invitation :
  // ce qu'il pèse, chaque invité le paye, y compris en 4G faible.
  it("stays under the 900-byte inline budget", () => {
    const bytes = new TextEncoder().encode(markup().outerHTML).length;
    expect(bytes).toBeLessThan(900);
  });

  // `vector-effect` n'est **pas** une propriété héritée : posée sur le <svg>
  // racine, elle ne touche aucun tracé. Le motif passe de 96 à 128 px au point
  // de rupture ; sans elle le fil épaissit de 1,25 à 1,67 px sur bureau,
  // silencieusement, sans qu'aucune erreur ne soit levée.
  it("puts the non-scaling stroke on each drawn path, where it actually applies", () => {
    const svg = markup();
    const drawn = [...svg.querySelectorAll("path, circle")];
    expect(drawn.length).toBeGreaterThan(0);
    for (const node of drawn) {
      expect(node).toHaveAttribute("vector-effect", "non-scaling-stroke");
    }
  });

  it("scales through a className rather than a hard-coded width", () => {
    const { container } = render(<HemMotif className="w-32" />);
    expect(container.querySelector("svg")).toHaveClass("w-32");
  });
});
