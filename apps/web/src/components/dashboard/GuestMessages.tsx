import { useId } from "react";
import type { HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";
import { motsDesInvites } from "@/lib/dashboard";

export interface GuestMessagesProps {
  foyers: readonly Pick<HouseholdAdminDto, "id" | "displayName" | "status" | "message" | "updatedAt">[];
}

/** En minuscules : le statut suit le nom dans la légende (« Famille Randria · confirmé »). */
const STATUT: Record<RsvpStatus, string> = {
  CONFIRMED: "confirmé",
  DECLINED: "décliné",
  PENDING: "en attente",
};

/**
 * Les mots que les foyers ont laissés en répondant — les quatre plus récents,
 * en Cormorant italique, entre guillemets français à espaces insécables.
 */
export function GuestMessages({ foyers }: GuestMessagesProps) {
  const titreId = useId();
  const mots = motsDesInvites(foyers);

  return (
    <section aria-labelledby={titreId}>
      <h2 id={titreId} className="font-display text-[1.625rem] text-ink md:text-[1.75rem]">
        Mots des invités
      </h2>
      <p className="mt-1 text-[0.8125rem] text-ink-muted md:text-sm">Les messages laissés en répondant</p>

      {mots.length === 0 ? (
        <p className="mt-3 border-t border-rule pt-4 text-sm text-ink-muted">Aucun mot pour l'instant.</p>
      ) : (
        <div className="mt-3 border-t border-rule">
          {mots.map((m) => (
            <figure key={m.id} className="border-b border-rule py-4 md:px-0.5">
              <blockquote className="font-display text-lg leading-snug text-ink italic md:text-xl">
                «&nbsp;{m.message}&nbsp;»
              </blockquote>
              <figcaption className="mt-1.5 text-xs text-ink-muted md:text-[0.8125rem]">
                {m.nom} · {STATUT[m.statut]}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
