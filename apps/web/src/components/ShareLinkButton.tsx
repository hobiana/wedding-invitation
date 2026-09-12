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
  if (typeof navigator.share !== "function") return null;

  async function partager() {
    try {
      await navigator.share({
        title: "Invitation au mariage",
        text: `Invitation pour ${householdName}`,
        url: invitationUrl(linkId),
      });
    } catch {
      // Fermer la feuille de partage rejette la promesse. Ce n'est pas un
      // échec : l'organisateur a simplement changé d'avis.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={partager}>
      <Share2 aria-hidden="true" className="mr-1.5 h-4 w-4" />
      <span aria-hidden="true">Partager</span>
      <span className="sr-only">Partager le lien de {householdName}</span>
    </Button>
  );
}
