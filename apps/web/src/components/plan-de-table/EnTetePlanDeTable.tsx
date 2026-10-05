import { formatWeddingDayMonth } from "@/lib/datetime";
import type { Bilan } from "@/lib/plan-de-table";

export interface EnTetePlanDeTableProps {
  /** `weddingDate` de `GET /admin/settings`. Absente ou illisible, l'étiquette s'efface. */
  dateDuMariage?: string | null;
  /** Absent tant que le plan charge : les chiffres n'apparaissent qu'avec lui. */
  bilan?: Bilan | null;
}

/** L'en-tête du plan de table au bureau : étiquette, titre, et deux chiffres à droite. */
export function EnTetePlanDeTable({ dateDuMariage, bilan }: EnTetePlanDeTableProps) {
  const jour = dateDuMariage ? formatWeddingDayMonth(dateDuMariage) : null;
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div>
        {/* En minuscules dans le texte, en capitales par le style : un lecteur
            d'écran doit lire « janvier », pas l'épeler. Or foncé : l'or
            ornemental ne porte jamais de texte. */}
        {jour && <p className="text-xs uppercase tracking-[0.2em] text-gold-ink">Réception · {jour}</p>}
        <h1 className="mt-1 font-display text-5xl leading-tight text-ink">Plan de table</h1>
      </div>
      {bilan && (
        <dl className="flex gap-10">
          <div className="flex flex-col-reverse items-start">
            <dt className="text-xs text-ink-muted">places attribuées</dt>
            <dd className="font-display text-3xl tabular-nums text-ink">
              {bilan.placesAttribuees} <span className="text-lg text-ink-muted">/ {bilan.placesTotales}</span>
            </dd>
          </div>
          <div className="flex flex-col-reverse items-start">
            <dt className="text-xs text-ink-muted">{bilan.foyersAPlacer >= 2 ? "foyers à placer" : "foyer à placer"}</dt>
            <dd className="font-display text-3xl tabular-nums text-ink">{bilan.foyersAPlacer}</dd>
          </div>
        </dl>
      )}
    </header>
  );
}
