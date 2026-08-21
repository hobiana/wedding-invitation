import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvitationResponseDto, SubmitRsvpDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { RsvpForm } from "@/components/RsvpForm";

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

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Bonjour {household.displayName} !</h1>
      <p>
        {new Date(wedding.weddingDate).toLocaleDateString("fr-FR", { dateStyle: "long" })} — {wedding.venueName}
      </p>
      <p className="text-sm text-neutral-600">{wedding.address}</p>
      {household.status !== "PENDING" && (
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
      <RsvpForm
        allocatedSeats={household.allocatedSeats}
        defaultConfirmedCount={household.confirmedCount ?? household.allocatedSeats}
        defaultDietaryNotes={household.dietaryNotes ?? ""}
        onSubmit={(dto) => rsvpMutation.mutate(dto)}
      />
    </div>
  );
}
