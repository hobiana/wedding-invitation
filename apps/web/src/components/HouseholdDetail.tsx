import type { ReactNode } from "react";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { MemberChips } from "@/components/MemberChips";
import { invitationUrl } from "@/lib/invitation-url";
import { motPlaces, places } from "@/lib/foyers";
import { cn } from "@/lib/utils";

/**
 * L'étiquette d'une section, en petites capitales. En or **foncé** : l'or
 * ornemental (`gold`, 3,58:1) ne porte jamais de texte.
 */
function Etiquette({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold-ink">{children}</span>;
}

export interface HouseholdDetailProps {
  household: HouseholdAdminDto;
  /**
   * « Copier le lien » et « Partager » sous l'adresse. Faux sur la carte du
   * téléphone, qui porte déjà ces deux boutons juste en dessous du panneau.
   */
  withLinkActions?: boolean;
  /**
   * « 3 / 4 places » à côté des membres. Faux sur la carte du téléphone, dont
   * l'en-tête l'affiche déjà une ligne plus haut.
   */
  withSeats?: boolean;
}

/**
 * Ce que la ligne n'a pas la place de porter : les membres, le régime, le mot
 * de l'invité, le lien. Un panneau crème qui se déplie sous la ligne (bureau)
 * ou dans la carte (téléphone). Plusieurs foyers peuvent rester ouverts à la
 * fois — c'est le geste réel quand on dépouille les réponses.
 *
 * Une section vide n'est pas rendue : une étiquette suivie d'un blanc se lit
 * comme une donnée perdue. Le lien, lui, existe toujours.
 */
export function HouseholdDetail({ household, withLinkActions = true, withSeats = true }: HouseholdDetailProps) {
  const aDesMembres = household.memberNames.some((nom) => nom.trim().length > 0);
  const aDuContenu = aDesMembres || Boolean(household.dietaryNotes) || Boolean(household.message);

  return (
    <div className="space-y-4 rounded-card border border-rule bg-cream p-4 md:p-5">
      {aDuContenu && (
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:gap-x-16">
          {aDesMembres && (
            <section className="min-w-0 space-y-2">
              <div className="flex items-baseline justify-between gap-8">
                <Etiquette>Membres</Etiquette>
                {withSeats && (
                  <span className="text-xs text-ink-muted tabular-nums">{places(household)} {motPlaces(household.allocatedSeats)}</span>
                )}
              </div>
              <MemberChips
                names={household.memberNames}
                label={`Membres de ${household.displayName}`}
                className="md:flex-col md:items-start"
              />
            </section>
          )}
          {household.dietaryNotes && (
            <section className="min-w-0 space-y-1">
              <Etiquette>Régime alimentaire</Etiquette>
              <p className="text-base text-ink">{household.dietaryNotes}</p>
            </section>
          )}
          {household.message && (
            <section className="min-w-0 space-y-1 md:max-w-md">
              <Etiquette>Message du foyer</Etiquette>
              <p className="text-base text-ink">{household.message}</p>
            </section>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-4",
          aDuContenu && "border-t border-rule pt-4",
        )}
      >
        <Etiquette>Lien d'invitation</Etiquette>
        <code className="min-w-0 break-all text-xs text-ink">{invitationUrl(household.id)}</code>
        {withLinkActions && (
          <div className="flex flex-wrap gap-2 md:ml-auto">
            <CopyLinkButton linkId={household.id} householdName={household.displayName} />
            <ShareLinkButton linkId={household.id} householdName={household.displayName} />
          </div>
        )}
      </div>
    </div>
  );
}
