import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HouseholdPublicDto, InvitationResponseDto, SubmitRsvpDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { RsvpForm } from "@/components/RsvpForm";
import { SeatingPlanSection } from "@/components/SeatingPlanSection";

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

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Bonjour {household.displayName} !</h1>
      <p>
        {new Date(wedding.weddingDate).toLocaleDateString("fr-FR", { dateStyle: "long" })} — {wedding.venueName}
      </p>
      <p className="text-sm text-neutral-600">{wedding.address}</p>
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
        <RsvpForm
          allocatedSeats={household.allocatedSeats}
          defaultConfirmedCount={household.confirmedCount ?? household.allocatedSeats}
          defaultDietaryNotes={household.dietaryNotes ?? ""}
          onSubmit={(dto) => rsvpMutation.mutate(dto)}
        />
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
