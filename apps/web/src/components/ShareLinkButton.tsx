import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invitationUrl } from "@/lib/invitation-url";

/**
 * Le chemin réel vers WhatsApp, sur téléphone : un appui au lieu de trois.
 *
 * Le composant ne se rend pas du tout quand le navigateur ne sait pas partager
 * — c'est le cas de tous les navigateurs de bureau. Un bouton présent mais
 * inerte serait pire que son absence.
 */
export interface ShareLinkButtonProps {
  linkId: string;
  householdName: string;
}

export function ShareLinkButton({ linkId, householdName }: ShareLinkButtonProps) {
  const [echec, setEchec] = useState(false);

  if (typeof navigator.share !== "function") return null;

  async function partager() {
    try {
      await navigator.share({
        title: "Invitation au mariage",
        text: `Invitation pour ${householdName}`,
        url: invitationUrl(linkId),
      });
      setEchec(false);
    } catch (erreur) {
      // Fermer la feuille de partage rejette la promesse avec une
      // `AbortError` : ce n'est pas un échec, l'organisateur a simplement
      // changé d'avis. Toute autre rejet est un vrai échec, et ne doit plus
      // disparaître en silence.
      if (erreur instanceof DOMException && erreur.name === "AbortError") {
        setEchec(false);
        return;
      }
      setEchec(true);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" onClick={partager}>
        <Share2 aria-hidden="true" className="mr-1.5 h-4 w-4" />
        <span aria-hidden="true">Partager</span>
        <span className="sr-only">Partager le lien de {householdName}</span>
      </Button>
      {echec && (
        <p role="alert" className="text-sm text-bordeaux-700">
          Le partage n'a pas abouti. Utilisez « Copier le lien ».
        </p>
      )}
    </div>
  );
}
