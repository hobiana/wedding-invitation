/**
 * Les classes partagées par la page invité — celles que la page et le
 * formulaire doivent porter à l'identique.
 *
 * Elles ne passent pas par `components/ui/button.tsx` volontairement : ce
 * fichier-là est le registre **admin**, en neutres (`bg-neutral-900`), et son
 * variant `destructive` est un `red-600` que la direction artistique interdit
 * à côté du bordeaux (§3.4, « pas de second rouge »). La page invité porte
 * l'identité complète ; l'admin reste sobre. Les deux registres ne partagent
 * pas de bouton, ils partagent des jetons.
 */

/**
 * §5 — le rythme vertical, « là où se joue *épuré* » : 96 px entre deux
 * sections de premier niveau sur mobile, 128 au-delà de 768 px. Il vit ici
 * plutôt que dans la page parce qu'une section qui peut disparaître — le plan
 * de table — doit emporter son air avec elle, sinon il reste un trou.
 */
export const sectionGapClassName = "mt-24 md:mt-32";

/** Colonne de texte : 520 px, ≈ 63 caractères à 17 px. Gouttière 24 px, 32 ≥ 520. */
export const columnClassName = "mx-auto w-full max-w-column px-6 min-[520px]:px-8";

/** Bande pleine largeur : elle traverse la gouttière, son contenu ne la traverse pas. */
export const bandClassName = "py-16";

/**
 * Le jeton `label` du §4.3 : 12 px, capitales, `+0,16 em`.
 * Interdit en bas-de-casse à cette taille — d'où les capitales imposées ici.
 */
export const eyebrowClassName =
  "text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink-muted";

/**
 * L'action principale de la page, dans la forme du design du commanditaire :
 * une barre pleine largeur en aplat bordeaux, capitales très espacées.
 *
 * Pas d'angles arrondis et pas de gras : à cette taille de capitale, c'est
 * l'interlettrage qui porte l'autorité, et un arrondi ferait bouton
 * d'application au milieu d'une page de papier.
 *
 * 56 px de haut, au-dessus du plancher de 44 px des cibles tactiles.
 */
export const guestButtonClassName = [
  "inline-flex min-h-14 w-full items-center justify-center",
  "bg-bordeaux-700 px-6 py-4 font-sans text-[0.75rem] uppercase tracking-[0.3em] text-on-bordeaux",
  "transition-colors duration-(--duration-micro) ease-(--ease-in)",
  "hover:bg-bordeaux-500",
  // `aria-busy` plutôt qu'une roue : le libellé qui change dit déjà l'attente,
  // et l'opacité n'est là que pour la doubler.
  "disabled:cursor-not-allowed aria-busy:opacity-70",
].join(" ");

/**
 * Le bouton texte — « Modifier notre réponse », « Revoir l'ouverture ». Le
 * soulignement ne se retire jamais : c'est le seul signal que c'est cliquable,
 * et la page n'a pas de bleu pour le dire.
 */
export const guestTextButtonClassName = [
  "inline-block py-2.5 text-[1.0625rem] text-bordeaux-700 underline underline-offset-[3px]",
  "decoration-1 transition-[text-decoration-thickness] duration-(--duration-micro)",
  "hover:decoration-2 focus-visible:decoration-2",
].join(" ");
