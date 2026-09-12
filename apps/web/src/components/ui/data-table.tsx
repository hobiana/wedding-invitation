import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Card } from "./card";

/**
 * La liste de l'admin, définie une fois et rendue deux fois : une vraie table
 * à partir de 768 px, une liste de cartes en dessous.
 *
 * Les deux rendus sortent des **mêmes colonnes**. C'est tout l'intérêt : trois
 * écrans s'en servent, et une table repliée à la main dans chacun d'eux
 * finirait par diverger — l'un afficherait la table, l'autre non.
 *
 * Un seul des deux existe dans le DOM à la fois (voir `useMediaQuery`).
 */
export interface Column<T> {
  id: string;
  header: string;
  cell: (ligne: T) => ReactNode;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (ligne: T) => string;
  detail?: (ligne: T) => ReactNode;
  detailLabel?: (ligne: T) => string;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  detail,
  detailLabel,
}: DataTableProps<T>) {
  const bureau = useMediaQuery("(min-width: 768px)");
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(() => new Set());

  function basculer(cle: string) {
    setOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  function boutonDeDepli(ligne: T, cle: string) {
    if (!detail) return null;
    const ouvert = ouverts.has(cle);
    return (
      <button
        type="button"
        onClick={() => basculer(cle)}
        aria-expanded={ouvert}
        aria-label={detailLabel?.(ligne) ?? "Détail"}
        className="rounded-control p-2 text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream hover:text-ink"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 transition-transform duration-(--duration-micro)", ouvert && "rotate-180")}
        />
      </button>
    );
  }

  if (!bureau) {
    return (
      <ul aria-label={caption} className="space-y-3">
        {rows.map((ligne) => {
          const cle = rowKey(ligne);
          return (
            <li key={cle}>
              <Card className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    {columns.map((colonne) => (
                      <div key={colonne.id} className="text-sm">
                        <span className="block text-xs uppercase tracking-wide text-ink-label">
                          {colonne.header}
                        </span>
                        <span className="text-ink">{colonne.cell(ligne)}</span>
                      </div>
                    ))}
                  </div>
                  {boutonDeDepli(ligne, cle)}
                </div>
                {detail && ouverts.has(cle) && (
                  <div className="border-t border-rule pt-2">{detail(ligne)}</div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-rule text-left">
          {columns.map((colonne) => (
            <th key={colonne.id} scope="col" className="py-2 font-medium text-ink-label">
              {colonne.header}
            </th>
          ))}
          {detail && <th scope="col" className="w-10" aria-label="Détail" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((ligne) => {
          const cle = rowKey(ligne);
          return (
            <Fragment key={cle}>
              <tr className="border-b border-rule align-top">
                {columns.map((colonne) => (
                  <td key={colonne.id} className="py-2 text-ink">
                    {colonne.cell(ligne)}
                  </td>
                ))}
                {detail && <td className="py-1">{boutonDeDepli(ligne, cle)}</td>}
              </tr>
              {detail && ouverts.has(cle) && (
                <tr className="border-b border-rule bg-cream/40">
                  <td colSpan={columns.length + 1} className="px-2 py-3">
                    {detail(ligne)}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
