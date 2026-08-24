/**
 * Le motif d'ourlet de la robe, relevé sur `images/motif/ourlet-brut.jpg`.
 *
 * C'est la **signature** de la page (§1.5.d). Trois éléments, dans l'ordre où
 * l'ourlet les pose : une **vrille en spirale**, une **longue tige ondulante**
 * qui sagit vers le bas comme la ligne d'ourlet elle-même, et une **fleur à
 * quatre pétales lancéolés en contour**, plantée au bout de la tige.
 *
 * La broderie réelle est un fil d'épaisseur constante — c'est-à-dire exactement
 * un `stroke` SVG. C'est le cas rare où un motif textile se transpose à l'écran
 * sans rien perdre : pas de remplissage à approximer, pas de matière.
 *
 * *Pourquoi quatre pétales et non six.* La fleur brodée porte quatre pétales
 * dominants en croix, plus deux remplissages courts que la main a ajoutés. À la
 * taille réelle du motif — 96 px de large, la fleur en occupe 22 — six pétales
 * se referment en astérisque et le dessin devient un dingbat. Quatre tiennent
 * l'écart, et c'est la croix allongée qui est la silhouette reconnaissable de
 * leur ourlet.
 *
 * Bicolore, et le partage n'est pas décoratif : la tige est en or
 * (`--color-gold`, 3,58:1 sur ivoire — au-dessus du seuil des éléments non
 * textuels, en dessous de celui du texte), la fleur en bordeaux 700 (10,38:1).
 * La partie qui porte le dessin est celle qui porte le contraste.
 *
 * Le composant est **muet** pour les technologies d'assistance : il n'ajoute
 * aucune information à la page, et un lecteur d'écran qui l'annoncerait
 * couperait la lecture des prénoms pour rien.
 */

/**
 * `stroke-width`, `stroke-linecap` et `stroke-linejoin` **sont** des propriétés
 * héritées : le `<svg>` racine les porte une fois pour tout le dessin.
 *
 * `vector-effect` ne l'est pas. Posée sur la racine elle ne touche aucun tracé,
 * et le fil épaissirait de 1,25 à 1,67 px au passage de 96 à 128 px sans
 * qu'aucune erreur ne soit levée. Elle va donc sur chaque forme dessinée — et
 * elle n'y est répétée que parce qu'elle ne peut pas l'être ailleurs, le budget
 * de 900 octets étant payé par chaque invité.
 */
const NON_SCALING = { vectorEffect: "non-scaling-stroke" } as const;

/** Vrille en spirale, puis la tige qui sagit et remonte vers la fleur. */
const STEM =
  "M6.5 17.5C8.7 17.5 9.2 20 9.2 21.5 9.2 23 7.4 23.2 6.5 23.2 5.6 23.2 5.5 22.1 5.5 21.5 5.5 20.9 6.2 21 6.5 21" +
  "M6.5 17.5c8.5 0 10 8.5 24 8.5 14 0 20.5-8 40-11.5";

/** Quatre pétales en croix, inclinée de 14° pour ne pas lire comme un signe +. */
const FLOWER =
  "M78 13Q81.1 6.6 75.3 2.3Q72.2 8.8 78 13Q74.9 19.4 80.7 23.7Q83.8 17.2 78 13" +
  "Q82.9 16.1 85.8 11.1Q80.9 8 78 13Q73.1 9.9 70.2 14.9Q75.1 18 78 13";

export function HemMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 28"
      fill="none"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path stroke="var(--color-gold)" d={STEM} {...NON_SCALING} />
      <path stroke="var(--color-bordeaux-700)" d={FLOWER} {...NON_SCALING} />
      {/* Le cœur est le seul aplat de la broderie — un nœud de fil, plein. */}
      <circle cx="78" cy="13" r="1" fill="var(--color-bordeaux-700)" stroke="none" {...NON_SCALING} />
    </svg>
  );
}
