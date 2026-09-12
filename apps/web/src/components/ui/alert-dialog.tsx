import { useRef } from "react";
import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

/**
 * La confirmation avant un geste irréversible.
 *
 * Deux règles y sont câblées plutôt que laissées à l'appelant :
 *
 * 1. **Le focus d'ouverture va sur Annuler.** Il est posé explicitement, sans
 *    se fier au comportement par défaut d'une version de Radix : une frappe
 *    sur Entrée juste après l'ouverture doit annuler, jamais détruire.
 * 2. **Le bouton porte le verbe réel** — « Supprimer le foyer », pas « OK ».
 *    Lu seul par un lecteur d'écran, « OK » ne dit pas ce qui va arriver.
 */
export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (ouvert: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: AlertDialogProps) {
  const annulerRef = useRef<HTMLButtonElement>(null);

  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fixed inset-0 bg-ink/40" />
        <RadixAlertDialog.Content
          onOpenAutoFocus={(evenement) => {
            evenement.preventDefault();
            annulerRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-rule bg-ivory p-6 shadow-card"
        >
          <RadixAlertDialog.Title className="font-display text-xl text-ink">
            {title}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2 text-sm text-ink-muted">
            {description}
          </RadixAlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <RadixAlertDialog.Cancel asChild>
              <Button ref={annulerRef} variant="outline">
                Annuler
              </Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <Button variant="destructive" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
