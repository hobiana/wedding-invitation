import { useId } from "react";
import { Link } from "react-router-dom";
import type { RsvpStatus, Seated, TableDto } from "@invitation-app/shared";
import { bilan, foyersAPlacer, placesLibresDe } from "@/lib/plan-de-table";

export interface SeatingCardProps {
  tables: TableDto[];
  foyers: (Seated & { id: string; status: RsvpStatus })[];
}

const accord = (n: number, singulier: string, pluriel: string) => `${n} ${n >= 2 ? pluriel : singulier}`;

/**
 * Le plan de table en trois nombres, avec le chemin pour y aller.
 *
 * Tout vient de `lib/plan-de-table.ts` — `foyersAPlacer` et `bilan`, les mêmes
 * calculs que l'écran du plan : un foyer sans réponse compte pour toute son
 * allocation, un décliné n'est pas « à placer ». Deux écrans qui compteraient
 * chacun à sa façon finiraient par se contredire.
 *
 * Affichée même quand le plan n'est pas montré aux invités : c'est l'outil de
 * l'organisateur (décision du commanditaire).
 */
export function SeatingCard({ tables, foyers }: SeatingCardProps) {
  const titreId = useId();
  const b = bilan(tables, foyersAPlacer(foyers, tables));
  const completes = tables.filter((t) => placesLibresDe(t) <= 0).length;
  const chiffres = [
    { valeur: b.placesAttribuees, mot: "placés" },
    { valeur: b.placesAPlacer, mot: "à placer" },
    // Une table qui déborde ne rend pas de chaises négatives.
    { valeur: Math.max(0, b.placesTotales - b.placesAttribuees), mot: "chaises libres" },
  ];

  return (
    <section
      aria-labelledby={titreId}
      className="rounded-card border border-rule bg-ivory p-[1.125rem] md:px-6 md:py-5"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={titreId} className="font-display text-[1.375rem] text-ink md:text-2xl">
          Plan de table
        </h2>
        <Link
          to="/admin/tables"
          aria-label="Ouvrir le plan de table"
          className="-my-2 py-2 text-[0.8125rem] text-bordeaux-700 underline underline-offset-2"
        >
          Ouvrir
        </Link>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        {chiffres.map((c) => (
          <div key={c.mot} className="flex flex-col-reverse">
            <dt className="mt-1 text-xs text-ink-muted md:text-[0.8125rem]">{c.mot}</dt>
            <dd className="font-display text-[2rem] leading-none text-ink tabular-nums md:text-4xl">{c.valeur}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-ink-muted md:text-[0.8125rem]">
        {tables.length === 0
          ? "Aucune table pour l'instant"
          : `${accord(tables.length, "table", "tables")}, ${accord(b.placesTotales, "chaise", "chaises")}` +
            (completes > 0 ? ` · ${accord(completes, "table complète", "tables complètes")}` : "")}
      </p>
    </section>
  );
}
