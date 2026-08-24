import type { ReactNode } from "react";

/**
 * Le titre de section de la page invité, et le **filet lamba** qui le suit.
 *
 * Le filet reprend le rythme `1/2/3/2/1` relevé au pixel sur les rayures du
 * lamba du couple (§1.5.d). C'est le second dispositif d'ornement de la page,
 * et le seul qui se répète : cette répétition est précisément ce qui le rend
 * structurel plutôt que décoratif. Il sort du même vêtement que le motif
 * d'ourlet du héros, si bien que les deux se lisent comme un système.
 *
 * Une rayure est de la géométrie pure : elle se reproduit exactement en
 * `linear-gradient`, pour zéro octet d'image.
 *
 * 64 px de large, pas la colonne entière — un onglet tissé, pas un surligneur.
 */
export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div>
      <h2 id={id} className="font-display text-[1.75rem] leading-tight text-bordeaux-900 md:text-[2rem]">
        {children}
      </h2>
      <div
        aria-hidden="true"
        className="mt-4 h-[9px] w-16 bg-[image:var(--rule-lamba)] bg-no-repeat"
      />
    </div>
  );
}
