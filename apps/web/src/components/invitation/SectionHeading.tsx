import type { ReactNode } from "react";

/**
 * Le titre de section de la page invité, et le filet qui le suit.
 *
 * Le filet était le rythme `1/2/3/2/1` du lamba du couple. Il ne l'est plus :
 * le commanditaire a tranché pour une seule langue ornementale, celle de son
 * design — les aquarelles de roses — et le motif malgache est sorti avec le
 * `HemMotif` du héros. Ce qui reste est le trait du design : 56 px sur 1,
 * à l'or, sous chaque titre.
 *
 * Il est `aria-hidden` : il structure l'œil, il n'ajoute pas un mot à ce que le
 * titre dit déjà, et un lecteur d'écran qui l'annoncerait couperait la lecture
 * pour rien.
 */
export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div>
      <h2 id={id} className="font-display text-[1.75rem] leading-tight text-bordeaux-900 md:text-[2rem]">
        {children}
      </h2>
      <div aria-hidden="true" className="mt-4 h-px w-14 bg-gold" />
    </div>
  );
}
