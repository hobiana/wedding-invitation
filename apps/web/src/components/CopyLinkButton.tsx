import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { invitationUrl } from "@/lib/invitation-url";

/**
 * Le geste central de l'organisateur : prendre le lien d'un foyer pour le
 * coller dans WhatsApp.
 *
 * Trois choses délibérées :
 *
 * - la confirmation est **dans le bouton**, deux secondes. Une notification
 *   volante en haut de l'écran se rate d'un coup d'œil et n'existe pas pour un
 *   lecteur d'écran ;
 * - le libellé nomme le foyer. Dans une liste de soixante lignes, « Copier »
 *   répété soixante fois ne dit pas quel lien on prend ;
 * - **en cas d'échec, le lien apparaît sélectionné**, avec la raison. Le
 *   silence ferait croire à une copie réussie.
 */
export interface CopyLinkButtonProps {
  linkId: string;
  householdName: string;
}

export function CopyLinkButton({ linkId, householdName }: CopyLinkButtonProps) {
  const [etat, setEtat] = useState<"repos" | "copie" | "manuel">("repos");
  const champRef = useRef<HTMLInputElement>(null);
  const url = invitationUrl(linkId);

  useEffect(() => {
    if (etat !== "copie") return;
    const minuteur = setTimeout(() => setEtat("repos"), 2000);
    return () => clearTimeout(minuteur);
  }, [etat]);

  useEffect(() => {
    if (etat === "manuel") champRef.current?.select();
  }, [etat]);

  async function copier() {
    setEtat((await copyToClipboard(url)) ? "copie" : "manuel");
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={copier}>
        {etat === "copie" ? (
          <Check aria-hidden="true" className="mr-1.5 h-4 w-4" />
        ) : (
          <Copy aria-hidden="true" className="mr-1.5 h-4 w-4" />
        )}
        <span aria-hidden="true">{etat === "copie" ? "Copié" : "Copier le lien"}</span>
        <span className="sr-only">
          {etat === "copie" ? `Lien de ${householdName} copié` : `Copier le lien de ${householdName}`}
        </span>
      </Button>

      {etat === "manuel" && (
        <div className="space-y-1">
          <p className="text-sm text-bordeaux-700">
            Le presse-papier n'est pas disponible ici. Le lien est sélectionné : copiez-le avec
            Ctrl+C.
          </p>
          <input
            ref={champRef}
            readOnly
            value={url}
            aria-label={`Lien de ${householdName}, à copier à la main`}
            className="w-full rounded-control border border-rule-strong bg-ivory px-2 py-1 text-xs text-ink"
          />
        </div>
      )}
    </div>
  );
}
