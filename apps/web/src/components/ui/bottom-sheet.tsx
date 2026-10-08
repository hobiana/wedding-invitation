import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useFocusDeRetour } from "./use-focus-de-retour";

export interface BottomSheetProps {
  open: boolean;
  /** Appelé avec `false` par ×, Échap ou un appui sur le fond assombri. */
  onOpenChange: (ouverte: boolean) => void;
  /** Petite étiquette au-dessus du titre (« Placer », « Trier »), en capitales par le style. */
  eyebrow?: string;
  /** Le nom du dialogue, en police d'affichage. */
  title: string;
  /** Une ligne sous le titre, liée par `aria-describedby`. */
  description?: string;
  children: ReactNode;
}

/**
 * La feuille du bas du téléphone : un dialogue posé contre le bord inférieur.
 * Extraite de la feuille « où placer ce foyer ? » du plan de table, pour que
 * la page Foyers (« Trier ») ait la même.
 *
 * Écrite sur `@radix-ui/react-dialog` plutôt que sur notre `Dialog` : la mise
 * en page (étiquette au-dessus du titre, bouton rond) n'est pas la sienne. Ce
 * qu'il apporte est repris tel quel — un seul piège de focus, Échap et le fond
 * qui ferment, le défilement de la page verrouillé, et `useFocusDeRetour` pour
 * rendre le focus au bouton qui l'a ouverte (nos feuilles n'ont pas de
 * `<Trigger>`, cf. le crochet).
 *
 * Elle plafonne à 85 % de la hauteur **dynamique** de l'écran (`dvh` : la
 * barre d'adresse mobile ne la rogne pas) et défile en dedans. Elle apparaît,
 * sans glisser depuis le bas : l'admin n'anime rien.
 */
export function BottomSheet({ open, onOpenChange, eyebrow, title, description, children }: BottomSheetProps) {
  const rendreLeFocus = useFocusDeRetour(open);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {open && (
        <RadixDialog.Portal>
          <RadixDialog.Overlay data-feuille-fond="" className="fixed inset-0 z-40 bg-ink/40" />
          <RadixDialog.Content
            onCloseAutoFocus={rendreLeFocus}
            // Sans description, on le dit à Radix : sinon il avertit en console.
            {...(description ? {} : { "aria-describedby": undefined })}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-photo bg-page px-5 pb-6 pt-3 shadow-card"
          >
            <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {/* Or foncé : l'or ornemental ne porte pas de texte. */}
                {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-gold-ink">{eyebrow}</p>}
                <RadixDialog.Title className="mt-1 break-words font-display text-3xl leading-tight text-ink">
                  {title}
                </RadixDialog.Title>
                {description && (
                  <RadixDialog.Description className="mt-1 text-sm text-ink-muted">{description}</RadixDialog.Description>
                )}
              </div>
              <RadixDialog.Close
                aria-label="Fermer"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-sand"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </RadixDialog.Close>
            </div>
            {children}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      )}
    </RadixDialog.Root>
  );
}
