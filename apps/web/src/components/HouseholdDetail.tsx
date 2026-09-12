import type { ReactNode } from "react";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { invitationUrl } from "@/lib/invitation-url";

/**
 * Ce que la ligne n'a pas la place de porter. Il se déplie sous elle, et
 * plusieurs foyers peuvent rester ouverts en même temps — c'est le geste réel
 * quand on dépouille les réponses.
 */
function Ligne({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <span className="text-xs uppercase tracking-wide text-ink-label">{label}</span>
      <span className="text-sm text-ink">{children}</span>
    </div>
  );
}

export function HouseholdDetail({ household }: { household: HouseholdAdminDto }) {
  return (
    <div className="space-y-3">
      {household.memberNames.length > 0 && (
        <Ligne label="Membres">{household.memberNames.join(", ")}</Ligne>
      )}
      {household.dietaryNotes && (
        <Ligne label="Régime alimentaire">{household.dietaryNotes}</Ligne>
      )}
      {household.message && <Ligne label="Message du foyer">{household.message}</Ligne>}
      <Ligne label="Lien d'invitation">
        <code className="break-all text-xs text-ink-muted">{invitationUrl(household.id)}</code>
      </Ligne>
      <div className="flex flex-wrap gap-2 pt-1">
        <CopyLinkButton linkId={household.id} householdName={household.displayName} />
        <ShareLinkButton linkId={household.id} householdName={household.displayName} />
      </div>
    </div>
  );
}
