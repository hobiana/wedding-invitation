import { useId } from "react";
import { formatWeddingTime } from "@/lib/datetime";
import { SCHEDULE } from "@/components/invitation/wedding-content";

/**
 * Le déroulé du jour, sur le bandeau bordeaux — le seul aplat sombre de la
 * page, ce qui suffit à le détacher sans qu'il ait besoin d'un cadre.
 *
 * Une liste **ordonnée** : trois moments qui se suivent, et l'ordre est
 * l'information. Un lecteur d'écran annonce « liste de 3 éléments » et les
 * numérote, là où six fragments d'affilée ne diraient pas lequel va avec
 * lequel. Le premier essai passait par un `<dl>` ; il imbriquait un `<dt>`
 * dans un div interne, ce qui est invalide et ne produit pas la paire annoncée.
 *
 * L'heure de la cérémonie vient de `wedding.weddingDate`, pas des constantes :
 * c'est l'heure à laquelle les gens doivent être assis dans une église, et
 * deux vérités pour cette heure-là divergeraient au premier ajustement.
 */
export function Schedule({ weddingDate }: { weddingDate: string }) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="bg-bordeaux-700 px-6 pb-12 pt-11 text-on-bordeaux"
    >
      <p className="text-center font-sans text-[0.72rem] uppercase tracking-[0.42em] text-gold-light">
        Le programme
      </p>
      <h2
        id={headingId}
        className="mt-2 text-center font-display text-[2.375rem] leading-[1.1] text-on-bordeaux"
      >
        Le déroulé du jour
      </h2>
      <div aria-hidden="true" className="mx-auto mt-4 h-px w-14 bg-gold-light" />

      <ol className="mx-auto mt-8 max-w-column list-none">
        {SCHEDULE.map((moment) => (
          <li
            key={moment.title}
            className="grid grid-cols-[4.5rem_1fr] items-baseline gap-5 border-t border-gold-light/20 py-6 last:border-b sm:grid-cols-[6.5rem_1fr]"
          >
            {/* L'heure d'abord, à l'écran comme dans le DOM : c'est elle qu'on
                cherche des yeux en parcourant un programme. */}
            <p className="font-display text-[1.875rem] font-light leading-none text-gold-light">
              {moment.time ?? formatWeddingTime(weddingDate)}
            </p>
            <div>
              <h3 className="font-display text-[1.5625rem] leading-tight">{moment.title}</h3>
              <p className="mt-2.5 font-sans text-[0.8125rem] font-light leading-[1.75] text-on-bordeaux-muted">
                {moment.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
