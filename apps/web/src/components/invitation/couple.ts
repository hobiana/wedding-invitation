/**
 * Les prénoms et la ville sont des **constantes de build**, pas des champs en
 * base : le produit est mono-événement par construction (décision arrêtée par
 * le commanditaire le 2026-08-22). Pas de migration, pas d'édition dans
 * l'admin, pas de requête pour afficher le titre de la page.
 *
 * Ils sont déjà écrits en dur dans `index.html` — `<title>`, `og:title`,
 * `og:description`. Si le couple change de prénoms, les deux endroits changent.
 * La **date**, elle, n'est pas ici : elle vient de l'API (`wedding.weddingDate`)
 * partout où la page peut la lire, pour qu'un seul enregistrement fasse foi.
 */
export const COUPLE = {
  /** Dans l'ordre où ils sont écrits sur le faire-part. */
  firstNames: ["Hobiana", "Lovasoa"] as const,
  /** Le lieu, tel qu'il se dit — pas l'adresse postale, qui vient de l'API. */
  city: "Antananarivo",
} as const;

/**
 * §4.3 — la taille du héros dépend de la longueur des prénoms, mesurée sur
 * Marcellus : `corps max = plancher(312 / (0,53 × caractères))`, et la règle
 * courte qui en découle : **deux prénoms de 8 caractères ou moins → 56 px sur
 * mobile ; au-delà → 44 px.** `Hobiana` et `Lovasoa` font 7 caractères, soit
 * ≈ 210 px de large à 56 px, dans les 312 px utiles d'un téléphone de 360 px.
 *
 * Un prénom ne se coupe jamais et ne se réduit jamais en `font-size` fluide :
 * deux prénoms de tailles différentes sur le héros serait une faute.
 */
export const HERO_NAME_CLASS =
  COUPLE.firstNames.every((name) => name.length <= 8)
    ? "text-[3.5rem] md:text-[4.5rem]"
    : "text-[2.75rem] md:text-[4.5rem]";
