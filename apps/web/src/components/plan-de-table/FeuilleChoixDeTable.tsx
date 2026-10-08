import { seatsFor, type TableDto } from "@invitation-app/shared";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { places, placesLibres } from "@/lib/accord";
import { choixDeTable } from "@/lib/plan-de-table";
import { cn } from "@/lib/utils";
import type { FoyerAPlacer } from "./HouseholdCard";

/** Le foyer dont on choisit la table, et celle qu'il quitte s'il est déjà assis (« Déplacer »). */
export interface FoyerADeplacer {
  foyer: FoyerAPlacer;
  depuis: string | null;
}

export interface FeuilleChoixDeTableProps {
  /** `null` : la feuille est fermée. */
  enJeu: FoyerADeplacer | null;
  tables: TableDto[];
  /** Un appui sur une table disponible. La feuille ne se ferme pas d'elle-même : l'appelant décide. */
  onChoisir: (table: TableDto) => void;
  /** × , Échap, ou un appui sur le fond assombri. */
  onFermer: () => void;
}

/** « 5 places libres », « 3 places libres · trop petite », « Complète ». */
function libelle(choix: ReturnType<typeof choixDeTable>): string {
  if (choix.etat === "complete") return "Complète";
  return choix.etat === "trop-petite" ? `${placesLibres(choix.libres)} · trop petite` : placesLibres(choix.libres);
}

/**
 * La feuille du bas du téléphone : « où placer ce foyer ? ».
 *
 * Le cadre — étiquette, titre, fermeture, piège de focus, Échap et fond qui
 * ferment, focus rendu au bouton d'ouverture — est `ui/BottomSheet`, partagé
 * avec la feuille « Trier » des Foyers. Ici ne vit que la liste des tables.
 *
 * Une table trop petite ou complète reste dans la liste, estompée **et dite** :
 * `aria-disabled` plutôt que `disabled`, pour qu'un lecteur d'écran la
 * rencontre et entende pourquoi. Ce n'est qu'un confort : le serveur tranche.
 */
export function FeuilleChoixDeTable({ enJeu, tables, onChoisir, onFermer }: FeuilleChoixDeTableProps) {
  return (
    <BottomSheet
      open={enJeu !== null}
      onOpenChange={(o) => !o && onFermer()}
      eyebrow={enJeu ? (enJeu.depuis ? "Déplacer" : "Placer") : undefined}
      title={enJeu?.foyer.displayName ?? ""}
      description={enJeu ? `${places(seatsFor(enJeu.foyer))} à ${enJeu.depuis ? "déplacer" : "placer"}` : undefined}
    >
      {enJeu && <ListeDesTables enJeu={enJeu} tables={tables} onChoisir={onChoisir} />}
    </BottomSheet>
  );
}

function ListeDesTables({
  enJeu,
  tables,
  onChoisir,
}: {
  enJeu: FoyerADeplacer;
  tables: TableDto[];
  onChoisir: (table: TableDto) => void;
}) {
  const choix = tables.filter((t) => t.id !== enJeu.depuis);
  if (choix.length === 0) {
    return (
      <p className="mt-5 text-sm text-ink-muted">
        {tables.length === 0
          ? "Aucune table pour l'instant : créez-en une dans l'onglet Tables."
          : "Aucune autre table pour l'instant : créez-en une dans l'onglet Tables."}
      </p>
    );
  }
  return (
    <ul className="mt-5 space-y-2">
      {choix.map((table) => {
        const c = choixDeTable(table, enJeu.foyer);
        const disponible = c.etat === "disponible";
        return (
          <li key={table.id}>
            <button
              type="button"
              aria-disabled={disponible ? undefined : true}
              onClick={() => disponible && onChoisir(table)}
              className={cn(
                "flex min-h-14 w-full items-center justify-between gap-3 rounded-surface border border-rule px-4 py-3 text-left transition-colors duration-(--duration-micro) ease-(--ease-in)",
                disponible ? "bg-page text-ink hover:bg-ivory" : "cursor-not-allowed bg-cream text-ink-muted",
              )}
            >
              <span className="min-w-0 break-words font-medium">{table.name}</span>
              <span className="shrink-0 text-right text-sm">{libelle(c)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
