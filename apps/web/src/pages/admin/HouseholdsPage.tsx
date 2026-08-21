import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateHouseholdDto, HouseholdAdminDto, UpdateHouseholdDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { HouseholdFormDialog } from "@/components/HouseholdFormDialog";

export function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdAdminDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateHouseholdDto) => api.post("/admin/households", dto),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["households"] });
      setDialogOpen(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  // Admins can always correct RSVP data, including past the guest-facing
  // deadline — the API allowed it all along, but nothing in the UI reached it.
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateHouseholdDto }) =>
      api.patch(`/admin/households/${id}`, dto),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["households"] });
      // The seating board reads seats from the household list.
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setEditing(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/households/${id}`),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["households"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Foyers invités</h1>
        <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Foyer</th>
              <th>Places</th>
              <th>Statut</th>
              <th>Régime / allergies</th>
              <th>Message</th>
              <th>Lien</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {households?.map((h) => (
              <tr key={h.id} className="border-b align-top">
                <td className="py-2">{h.displayName}</td>
                <td>
                  {h.confirmedCount ?? "—"} / {h.allocatedSeats}
                </td>
                <td>
                  <StatusBadge status={h.status} />
                </td>
                {/* Guests can write freely here, so truncate and put the full
                    text in the title attribute rather than wrecking the row. */}
                <td className="max-w-[14rem] truncate" title={h.dietaryNotes ?? ""}>
                  {h.dietaryNotes || "—"}
                </td>
                <td className="max-w-[14rem] truncate" title={h.message ?? ""}>
                  {h.message || "—"}
                </td>
                <td>
                  <code className="text-xs">{`${window.location.origin}/i/${h.id}`}</code>
                </td>
                <td className="whitespace-nowrap">
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => setEditing(h)}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(h.id)}>
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isDialogOpen && (
        <HouseholdFormDialog
          onSubmit={(dto) => createMutation.mutate(dto)}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {editing && (
        // key so switching rows re-seeds the dialog's internal form state
        <HouseholdFormDialog
          key={editing.id}
          initial={editing}
          onSubmit={(dto) => updateMutation.mutate({ id: editing.id, dto })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
