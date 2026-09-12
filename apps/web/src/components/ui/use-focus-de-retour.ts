import { useRef } from "react";

/**
 * Ramène le focus là où il était avant l'ouverture du dialogue.
 *
 * Radix le fait déjà — mais seulement vers le `<Trigger>` qu'il connaît :
 *
 *     onCloseAutoFocus: (event) => {
 *       event.preventDefault();
 *       context.triggerRef.current?.focus();
 *     }
 *
 * Il annule donc la restitution de `FocusScope` **puis** focalise son propre
 * déclencheur. Or nos dialogues sont montés par l'état de la page —
 * `{aSupprimer && <AlertDialog open …>}` — et n'ont pas de `<Trigger>` : ce ref
 * vaut `null`, rien n'est focalisé, et le focus retombe sur `<body>`.
 *
 * Ce que ça coûte : l'organisateur qui ferme le dialogue d'une ligne se
 * retrouve en haut du document et doit retraverser toute la table pour revenir
 * où il était. Relevé à l'écran, pas en test.
 *
 * On mémorise donc nous-mêmes l'élément focalisé à l'ouverture, et on le
 * renvoie à `onCloseAutoFocus`.
 */
export function useFocusDeRetour(ouvert: boolean) {
  const avantOuverture = useRef<HTMLElement | null>(null);

  // Lu pendant le rendu, et non dans un effet. Les effets des enfants passent
  // avant ceux du parent : le `FocusScope` de Radix a déjà déplacé le focus
  // sur « Annuler » quand un effet posé ici s'exécuterait, et c'est ce bouton —
  // détruit une seconde plus tard — qu'on mémoriserait. Au rendu, en revanche,
  // le DOM porte encore le focus du déclencheur.
  //
  // La version à effet passait pourtant les tests : jsdom et Chrome n'ordonnent
  // pas ces deux focalisations pareil. C'est l'écran qui a tranché.
  if (ouvert && avantOuverture.current === null) {
    avantOuverture.current = document.activeElement as HTMLElement | null;
  }

  return (evenement: Event) => {
    const cible = avantOuverture.current;
    // Vidée ici, au moment où elle a servi — et surtout pas au rendu de la
    // fermeture. Radix n'appelle `onCloseAutoFocus` qu'au démontage du contenu,
    // donc après le rendu : un appelant qui garderait le dialogue monté en
    // basculant `open` — l'usage normal de Radix, que notre interface publique
    // autorise — aurait vu la mémoire effacée avant d'avoir servi, et le focus
    // retomber sur `<body>`. Le bug même que ce crochet ferme.
    //
    // La vider est nécessaire : sans ça, la deuxième ouverture d'un dialogue
    // resté monté rendrait le focus au déclencheur de la première.
    avantOuverture.current = null;
    // Après une suppression confirmée, la ligne et son bouton n'existent plus.
    // `focus()` sur un nœud détaché ne fait rien et laisse le focus sur
    // `<body>` sans rien signaler : dans ce cas on laisse Radix faire.
    if (!cible || cible === document.body || !document.contains(cible)) return;
    evenement.preventDefault();
    cible.focus();
  };
}
