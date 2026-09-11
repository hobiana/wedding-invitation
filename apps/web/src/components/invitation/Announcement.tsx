import { useId } from "react";
import { formatWeddingTime, weddingDateParts } from "@/lib/datetime";
import {
  ANNOUNCEMENT,
  CEREMONY_VENUE,
  MALAGASY,
  PARENTS,
  SPOUSES,
} from "@/components/invitation/wedding-content";

/** Le jeton « étiquette » du design : Jost, capitales, très espacé. */
const labelClassName = "font-sans text-[0.75rem] uppercase tracking-[0.28em]";

/**
 * Le faire-part proprement dit : l'encart encadré d'or où les deux familles
 * annoncent le mariage.
 *
 * Tout son texte est fixe et vient de `wedding-content.ts` — sauf la date, qui
 * vient de l'API. Le design écrivait « Samedi 09h00 · 02 · Janvier 2027 » en
 * dur à cet endroit ; une heure corrigée dans l'admin aurait laissé ce bloc-là
 * en arrière, et c'est précisément celui qu'un invité relit pour noter l'heure.
 *
 * L'aquarelle qui déborde à droite est muette pour les lecteurs d'écran : elle
 * ne dit rien que le texte ne dise, et l'annoncer couperait la lecture du
 * faire-part pour une fleur.
 */
export function Announcement({ weddingDate }: { weddingDate: string }) {
  const headingId = useId();
  const { weekday, day, month, year } = weddingDateParts(weddingDate);

  return (
    <section aria-labelledby={headingId} className="px-4 pb-10 pt-2">
      <div className="relative border border-gold/40 bg-ivory px-6 py-9 text-center">
        {/* Elle déborde du cadre : c'est ce débordement qui empêche l'encart
            de ressembler à une boîte de formulaire. */}
        <img
          src="/decor/branche-fleurie.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-9 top-[26%] w-28 animate-float select-none"
        />

        <h2 id={headingId} className={`${labelClassName} text-bordeaux-500`}>
          Le faire-part
        </h2>

        {/* Les mères, sans libellé : la disposition côte à côte, au-dessus des
            deux noms de famille qu'on retrouve juste dessous, dit la parenté. */}
        <ul className="mt-7 grid list-none grid-cols-1 gap-4 text-[1.1875rem] leading-[1.45] min-[420px]:grid-cols-2">
          {PARENTS.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        <p className="mt-7 font-sans text-[0.78rem] uppercase leading-[1.9] tracking-[0.1em] text-ink-muted">
          {ANNOUNCEMENT}
        </p>

        <div className="mt-6 flex flex-col gap-1.5">
          {SPOUSES.map((spouse, index) => (
            <div key={spouse.fullName}>
              <p className="text-[1.625rem] leading-tight">{spouse.fullName}</p>
              <p className={`${labelClassName} text-gold-ink`}>{spouse.role}</p>
              {/* L'esperluette entre les deux, jamais après le second. */}
              {index === 0 && (
                <p aria-hidden="true" className="my-1 font-display text-[1.375rem] italic text-gold-ink">
                  &amp;
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-ink/15 pt-6">
          <p className={`${labelClassName} text-ink-muted`}>Cérémonie religieuse à</p>
          <p className="mt-2 text-[1.375rem]">{CEREMONY_VENUE}</p>

          {/* Le bloc à trois colonnes du design. Il se lit « samedi 9 h 00,
              le 2 janvier 2027 » et se voit comme un chiffre entre deux
              filets — d'où le grand `02`, qui flotterait seul en `2`. */}
          <div
            data-testid="bloc-date"
            className="mt-6 flex items-center justify-center gap-4 font-sans text-[0.75rem] uppercase leading-[1.7] tracking-[0.2em] text-ink-muted"
          >
            <p className="flex-1 text-right">
              <span className="block">{weekday}</span>
              <span className="block">{formatWeddingTime(weddingDate)}</span>
            </p>
            <p className="border-x border-gold/40 px-4 font-display text-[3.625rem] normal-case leading-none tracking-normal text-bordeaux-500">
              {day}
            </p>
            <p className="flex-1 text-left">
              <span className="block">{month}</span>
              <span className="block">{year}</span>
            </p>
          </div>
        </div>

        {/* Le malgache n'est pas une traduction de la page : c'est l'accueil,
            là où le français dirait la même chose en plus plat. */}
        <p className="mt-6 font-display text-[1.1875rem] italic text-gold-ink">
          {MALAGASY.welcome}
        </p>
      </div>
    </section>
  );
}
