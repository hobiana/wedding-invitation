import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateHouseholdDto, HouseholdAdminDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { HouseholdFormDialog } from "@/components/HouseholdFormDialog";

export function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateHouseholdDto) => api.post("/admin/households", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/households/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["households"] }),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Foyers invités</h1>
        <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Foyer</th>
            <th>Places</th>
            <th>Statut</th>
            <th>Lien</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {households?.map((h) => (
            <tr key={h.id} className="border-b">
              <td className="py-2">{h.displayName}</td>
              <td>{h.allocatedSeats}</td>
              <td><StatusBadge status={h.status} /></td>
              <td>
                <code className="text-xs">{`${window.location.origin}/i/${h.id}`}</code>
              </td>
              <td>
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(h.id)}>
                  Supprimer
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isDialogOpen && (
        <HouseholdFormDialog
          onSubmit={(dto) => createMutation.mutate(dto)}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
