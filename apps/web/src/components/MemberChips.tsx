import { initiale } from "@/lib/foyers";
import { cn } from "@/lib/utils";

export interface MemberChipsProps {
  /** Les noms complets, tels que saisis (`memberNames`). */
  names: readonly string[];
  /** Le nom de la liste pour l'assistance technique (« Membres de Famille Rakoto »). */
  label: string;
  /** Disposition de la liste (en colonne sur bureau, par exemple). */
  className?: string;
}

/**
 * Les membres d'un foyer en pastilles : l'initiale dans un rond, puis le nom
 * complet. L'initiale est décorative (`aria-hidden`) — le nom la porte déjà.
 * Les prénoms sont facultatifs (invariant 5) : un foyer sans membre ne rend
 * rien, pas une liste vide.
 */
export function MemberChips({ names, label, className }: MemberChipsProps) {
  const noms = names.map((nom) => nom.trim()).filter(Boolean);
  if (noms.length === 0) return null;

  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {noms.map((nom, index) => (
        <li
          // Deux membres peuvent porter le même nom : l'index départage.
          key={`${index}-${nom}`}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-page py-1 pl-1 pr-3 text-sm text-ink"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-pending-bg text-xs font-medium text-ink"
          >
            {initiale(nom)}
          </span>
          {nom}
        </li>
      ))}
    </ul>
  );
}
