import { useId } from "react";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmptyState } from "@/components/ui/empty-state";
import { foyersARelancer, placesParStatut } from "@/lib/dashboard";
import { places } from "@/lib/accord";

export interface RelanceListProps {
  foyers: readonly HouseholdAdminDto[];
}

/**
 * Les foyers qui n'ont pas répondu, et le geste qui les relance : copier leur
 * lien pour le coller dans WhatsApp.
 *
 * **Les plus grands foyers d'abord** (`foyersARelancer`) : c'est là qu'il y a
 * le plus de places en jeu. Chaque ligne affiche les places **accordées** —
 * jamais `confirmedCount`, qui reste `null` tant que le foyer n'a pas répondu.
 */
export function RelanceList({ foyers }: RelanceListProps) {
  const titreId = useId();
  const liste = foyersARelancer(foyers);
  const enJeu = placesParStatut(liste).enAttente;

  return (
    <section aria-labelledby={titreId}>
      <h2 id={titreId} className="font-display text-[1.625rem] text-ink md:text-[1.75rem]">
        À relancer
      </h2>
      {liste.length > 0 && (
        <p className="mt-1 text-[0.8125rem] text-ink-muted md:text-sm">
          {liste.length} {liste.length >= 2 ? "foyers" : "foyer"}, {places(enJeu)} en jeu · les plus grands foyers
          en premier
        </p>
      )}

      {liste.length === 0 ? (
        <div className="mt-3">
          {/* Deux vides, deux phrases. « Personne à relancer » est une bonne
              nouvelle ; « aucun foyer saisi » est un travail qui reste entier. */}
          <EmptyState
            title={foyers.length ? "Aucun foyer en attente" : "Aucun foyer"}
            description={
              foyers.length
                ? "Tous les foyers invités ont répondu. Il n'y a plus personne à relancer."
                : "La liste des foyers se saisit depuis l'écran Foyers. Chacun y reçoit son lien d'invitation."
            }
          />
        </div>
      ) : (
        <ul className="mt-3 border-t border-rule">
          {liste.map((foyer) => (
            <li
              key={foyer.id}
              className="flex items-start justify-between gap-3 border-b border-rule py-2.5 md:px-0.5 md:py-3"
            >
              <div className="min-w-0 pt-0.5">
                <p className="text-[0.9375rem] font-medium break-words text-ink">{foyer.displayName}</p>
                <p className="text-[0.8125rem] text-ink-muted">{places(foyer.allocatedSeats)}</p>
              </div>
              <CopyLinkButton
                linkId={foyer.id}
                householdName={foyer.displayName}
                className="shrink-0"
                buttonClassName="h-11 px-3.5 text-[0.8125rem] font-normal md:h-9"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
