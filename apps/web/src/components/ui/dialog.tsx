import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useFocusDeRetour } from "./use-focus-de-retour";

/**
 * Le cadre modal. Radix, décision arrêtée : le `<dialog>` natif n'a pas le
 * piège de focus, le verrou de défilement et la restitution du focus à la
 * fermeture, et les réécrire à la main est précisément ce qui rate.
 *
 * Le titre est obligatoire et lié par `aria-labelledby` : un dialogue sans nom
 * s'annonce « dialogue », ce qui n'apprend rien.
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (ouvert: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  const rendreLeFocus = useFocusDeRetour(open);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40" />
        <RadixDialog.Content
          onCloseAutoFocus={rendreLeFocus}
          className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-rule bg-ivory p-6 shadow-card"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <RadixDialog.Title className="font-display text-xl text-ink">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-sm text-ink-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Fermer"
              className="rounded-control p-1 text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream hover:text-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
