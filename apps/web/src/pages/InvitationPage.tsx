import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HouseholdPublicDto, InvitationResponseDto, SubmitRsvpDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { RsvpForm } from "@/components/RsvpForm";
import { SeatingPlanSection } from "@/components/SeatingPlanSection";

/**
 * mapUrl is free text typed into the admin settings form. Anything that isn't
 * a plain http(s) URL — a `javascript:` scheme, or just a typo — is dropped
 * rather than handed to an href on the one page every guest opens.
 */
function httpUrlOrNull(url: string | null): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const nameFormatter = new Intl.ListFormat("fr-FR", { style: "long", type: "conjunction" });

/** "Jean", "Marie" et "Paul" → "Jean, Marie et Paul". */
function formatNames(names: string[]): string {
  return nameFormatter.format(names);
}

export function InvitationPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["invitation", linkId],
    queryFn: () => api.get<InvitationResponseDto>(`/invitation/${linkId}`),
    enabled: !!linkId,
  });

  const rsvpMutation = useMutation({
    mutationFn: (dto: SubmitRsvpDto) => api.patch(`/invitation/${linkId}/rsvp`, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitation", linkId] }),
  });

  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (error || !data) return <div className="p-8 text-center">Invitation introuvable.</div>;

  const { household, wedding } = data;
  // The API returns a raw English 403 ("RSVP deadline has passed") once the
  // deadline is up. Rendering the form anyway meant a guest could fill it in,
  // submit, and get that English string in an otherwise-French page.
  const rsvpClosed = new Date() > new Date(wedding.rsvpDeadline);
  // toLocaleString, not toLocaleDateString: the latter throws on `timeStyle`,
  // which is how the ceremony time came to be dropped from the invitation.
  const weddingDateTime = new Date(wedding.weddingDate).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const deadlineDateTime = new Date(wedding.rsvpDeadline).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const mapHref = httpUrlOrNull(wedding.mapUrl);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Bonjour {household.displayName} !</h1>
        {household.memberNames.length > 0 && (
          <p className="text-base text-neutral-700">Invitation pour {formatNames(household.memberNames)}.</p>
        )}
      </header>

      <section aria-labelledby="infos-pratiques" className="space-y-4">
        <h2 id="infos-pratiques" className="text-lg font-semibold">
          Informations pratiques
        </h2>
        {/* Every optional field is rendered only when filled in: an empty
            "Tenue" heading tells the guest nothing and looks like a bug. */}
        <dl className="space-y-4">
          <div className="space-y-1">
            <dt className="text-sm font-medium text-neutral-500">Quand</dt>
            <dd className="text-base">{weddingDateTime}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium text-neutral-500">Où</dt>
            <dd className="text-base space-y-1">
              <span className="block">{wedding.venueName}</span>
              <span className="block text-neutral-700">{wedding.address}</span>
              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block underline underline-offset-2"
                >
                  Voir l'itinéraire<span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
            </dd>
          </div>
          {wedding.dressCode && (
            <div className="space-y-1">
              <dt className="text-sm font-medium text-neutral-500">Tenue</dt>
              <dd className="text-base">{wedding.dressCode}</dd>
            </div>
          )}
          {wedding.parkingInfo && (
            <div className="space-y-1">
              <dt className="text-sm font-medium text-neutral-500">Stationnement</dt>
              <dd className="text-base">{wedding.parkingInfo}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Suppressed once closed: ClosedRsvpSummary restates the answer in full. */}
      {!rsvpClosed && household.status !== "PENDING" && (
        <p className="text-sm">Statut actuel : {household.status === "CONFIRMED" ? "Confirmé" : "Décliné"}</p>
      )}
      {rsvpMutation.isSuccess && (
        <p className="text-sm text-green-700">Merci, votre réponse a bien été enregistrée !</p>
      )}
      {rsvpMutation.isError && (
        <p className="text-sm text-red-600">
          {rsvpMutation.error instanceof Error ? rsvpMutation.error.message : "Une erreur est survenue."}
        </p>
      )}
      {rsvpClosed ? (
        <ClosedRsvpSummary household={household} />
      ) : (
        <section aria-labelledby="votre-reponse" className="space-y-4">
          <h2 id="votre-reponse" className="text-lg font-semibold">
            Votre réponse
          </h2>
          {/* The deadline has to be readable *before* answering. It used to
              surface only once it had passed and locked the form. */}
          <p className="text-base text-neutral-700">Merci de nous répondre avant le {deadlineDateTime}.</p>
          <RsvpForm
            allocatedSeats={household.allocatedSeats}
            defaultConfirmedCount={household.confirmedCount ?? household.allocatedSeats}
            defaultDietaryNotes={household.dietaryNotes ?? ""}
            onSubmit={(dto) => rsvpMutation.mutate(dto)}
          />
        </section>
      )}
      <SeatingPlanSection seatingPlan={data.seatingPlan} />
    </div>
  );
}

/** Read-only replacement for the RSVP form once the deadline has passed. */
function ClosedRsvpSummary({ household }: { household: HouseholdPublicDto }) {
  return (
    <div className="border rounded-lg p-4 space-y-1">
      <p className="font-medium">Les réponses sont closes.</p>
      {household.status === "CONFIRMED" && (
        <p className="text-sm text-neutral-600">
          Votre réponse : {household.confirmedCount ?? 0} personne
          {(household.confirmedCount ?? 0) > 1 ? "s" : ""} présente
          {(household.confirmedCount ?? 0) > 1 ? "s" : ""}.
        </p>
      )}
      {household.status === "DECLINED" && (
        <p className="text-sm text-neutral-600">Votre réponse : vous ne pourrez pas être des nôtres.</p>
      )}
      {household.status === "PENDING" && (
        <p className="text-sm text-neutral-600">Nous n'avons pas reçu votre réponse.</p>
      )}
      {household.dietaryNotes && (
        <p className="text-sm text-neutral-600">Régime alimentaire / allergies : {household.dietaryNotes}</p>
      )}
      <p className="text-sm text-neutral-500">
        Pour toute modification, merci de contacter directement les organisateurs.
      </p>
    </div>
  );
}
