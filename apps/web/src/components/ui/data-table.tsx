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
  /**
   * Cette colonne prend toute la largeur restante ; les autres se réduisent à
   * leur contenu. Pour la colonne qui peut être longue (le nom d'un foyer) :
   * sans cela l'espace en trop se répartit entre toutes les colonnes. Rendu en
   * table seulement — les cartes n'ont pas de colonnes.
   */
  grow?: boolean;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (ligne: T) => string;
  detail?: (ligne: T) => ReactNode;
  detailLabel?: (ligne: T) => string;
  /**
   * Les lignes dépliées, quand l'appelant veut les tenir lui-même — l'écran
   * Foyers pagine, et le dépli doit survivre au changement de page. À fournir
   * avec `onToggleExpanded` ; sans eux, la table tient son propre état.
   */
  expanded?: ReadonlySet<string>;
  onToggleExpanded?: (cle: string) => void;
  /**
   * La carte du téléphone, dessinée par l'appelant quand la carte générique
   * (une étiquette devant chaque valeur) ne lui convient pas — Foyers a son
   * nom, son statut et ses boutons. La table lui passe l'état de dépli de la
   * ligne et le geste qui le bascule ; elle ne sait rien de ce qu'il y a dedans.
   * Sans effet sur bureau, où la table reste une table.
   */
  renderCard?: (ligne: T, depli: { ouvert: boolean; basculer: () => void }) => ReactNode;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  detail,
  detailLabel,
  expanded,
  onToggleExpanded,
  renderCard,
}: DataTableProps<T>) {
  const bureau = useMediaQuery("(min-width: 768px)");
  const [ouvertsInternes, setOuverts] = useState<ReadonlySet<string>>(() => new Set());
  const ouverts = expanded ?? ouvertsInternes;

  function basculer(cle: string) {
    if (onToggleExpanded) {
      onToggleExpanded(cle);
      return;
    }
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
        // La cible fait 40 px ; le rond visible, 32 — celui de la maquette.
        className="group inline-flex h-10 w-10 items-center justify-center rounded-full"
      >
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-(--duration-micro) ease-(--ease-in)",
            ouvert
              ? "border-bordeaux-700 bg-bordeaux-700 text-on-bordeaux"
              : "border-rule text-ink group-hover:bg-cream",
          )}
        >
          {/* La flèche se retourne, sans tourner : l'admin n'anime rien. */}
          <ChevronDown aria-hidden="true" className={cn("h-4 w-4", ouvert && "rotate-180")} />
        </span>
      </button>
    );
  }

  if (!bureau && renderCard) {
    return (
      <ul aria-label={caption} className="space-y-3">
        {rows.map((ligne) => {
          const cle = rowKey(ligne);
          return <li key={cle}>{renderCard(ligne, { ouvert: ouverts.has(cle), basculer: () => basculer(cle) })}</li>;
        })}
      </ul>
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

  // Dès qu'une colonne est extensible, les autres se réduisent à leur contenu
  // (`w-px` + `nowrap`) et gardent un écart à droite pour ne pas se toucher.
  const aUneExtensible = columns.some((c) => c.grow);
  const largeur = (colonne: Column<T>) =>
    aUneExtensible ? (colonne.grow ? "w-full pr-6" : "w-px whitespace-nowrap pr-6") : undefined;

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-rule text-left">
          {columns.map((colonne) => (
            <th
              key={colonne.id}
              scope="col"
              // Or foncé : l'or ornemental ne porte pas de texte.
              className={cn("pb-3 text-xs font-medium uppercase tracking-[0.15em] text-gold-ink", largeur(colonne))}
            >
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
              <tr className={cn("align-middle", !(detail && ouverts.has(cle)) && "border-b border-rule")}>
                {columns.map((colonne) => (
                  <td key={colonne.id} className={cn("py-3 text-ink", largeur(colonne))}>
                    {colonne.cell(ligne)}
                  </td>
                ))}
                {detail && <td className="py-2 text-right">{boutonDeDepli(ligne, cle)}</td>}
              </tr>
              {detail && ouverts.has(cle) && (
                // Le panneau (crème, arrondi) est dessiné par `detail` ; la ligne
                // ne fait que lui laisser la largeur et un peu d'air.
                <tr className="border-b border-rule">
                  <td colSpan={columns.length + 1} className="pb-4">
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
