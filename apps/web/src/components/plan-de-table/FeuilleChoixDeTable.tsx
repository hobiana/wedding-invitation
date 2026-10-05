import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { seatsFor, type TableDto } from "@invitation-app/shared";
import { useFocusDeRetour } from "@/components/ui/use-focus-de-retour";
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
 * Écrite sur `@radix-ui/react-dialog` plutôt que sur notre `Dialog` : la mise
 * en page de la maquette (étiquette au-dessus du titre, bouton rond) n'est pas
 * la sienne. Ce qu'il apporte est repris tel quel — un seul piège de focus,
 * Échap et le fond qui ferment, le défilement verrouillé, et `useFocusDeRetour`
 * pour rendre le focus au bouton qui l'a ouverte (nos feuilles n'ont pas de
 * `<Trigger>`, cf. le crochet).
 *
 * Elle apparaît, sans glisser depuis le bas : l'admin n'anime rien.
 *
 * Une table trop petite ou complète reste dans la liste, estompée **et dite** :
 * `aria-disabled` plutôt que `disabled`, pour qu'un lecteur d'écran la
 * rencontre et entende pourquoi. Ce n'est qu'un confort : le serveur tranche.
 */
export function FeuilleChoixDeTable({ enJeu, tables, onChoisir, onFermer }: FeuilleChoixDeTableProps) {
  const ouverte = enJeu !== null;
  const rendreLeFocus = useFocusDeRetour(ouverte);

  return (
    <RadixDialog.Root open={ouverte} onOpenChange={(o) => !o && onFermer()}>
      {enJeu && (
        <RadixDialog.Portal>
          <RadixDialog.Overlay data-feuille-fond="" className="fixed inset-0 z-40 bg-ink/40" />
          <RadixDialog.Content
            onCloseAutoFocus={rendreLeFocus}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-photo bg-page px-5 pb-6 pt-3 shadow-card"
          >
            <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {/* En minuscules dans le texte, en capitales par le style. Or
                    foncé : l'or ornemental ne porte pas de texte. */}
                <p className="text-xs uppercase tracking-[0.2em] text-gold-ink">
                  {enJeu.depuis ? "Déplacer" : "Placer"}
                </p>
                <RadixDialog.Title className="mt-1 break-words font-display text-3xl leading-tight text-ink">
                  {enJeu.foyer.displayName}
                </RadixDialog.Title>
                <RadixDialog.Description className="mt-1 text-sm text-ink-muted">
                  {places(seatsFor(enJeu.foyer))} à {enJeu.depuis ? "déplacer" : "placer"}
                </RadixDialog.Description>
              </div>
              <RadixDialog.Close
                aria-label="Fermer"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-sand"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </RadixDialog.Close>
            </div>

            <ListeDesTables enJeu={enJeu} tables={tables} onChoisir={onChoisir} />
          </RadixDialog.Content>
        </RadixDialog.Portal>
      )}
    </RadixDialog.Root>
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
