import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTableDto, HouseholdAdminDto, TableDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { TableBoard } from "@/components/TableBoard";

export function TablesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState("");

  const { data: tables } = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get<TableDto[]>("/admin/tables"),
  });
  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  const createTable = useMutation({
    mutationFn: (dto: CreateTableDto) => api.post("/admin/tables", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setNewTableName("");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ tableId, householdId }: { tableId: string; householdId: string }) =>
      api.patch(`/admin/tables/${tableId}/assign/${householdId}`),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const unassignMutation = useMutation({
    mutationFn: (householdId: string) => api.patch(`/admin/tables/unassign/${householdId}`),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["households"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  // A household is "unassigned" only if it doesn't appear in ANY table's households array.
  const assignedIds = new Set(tables?.flatMap((t) => t.households.map((h) => h.id)) ?? []);
  const unassignedHouseholds = (households ?? []).filter((h) => !assignedIds.has(h.id));

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Plan de table</h1>
      <div className="flex gap-2">
        <input
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          placeholder="Nom de la table"
          className="border rounded-md px-3 py-2"
        />
        <Button onClick={() => createTable.mutate({ name: newTableName })} disabled={!newTableName}>
          Ajouter une table
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <TableBoard
        tables={tables ?? []}
        unassignedHouseholds={unassignedHouseholds}
        onAssign={(tableId, householdId) => assignMutation.mutate({ tableId, householdId })}
        onUnassign={(householdId) => unassignMutation.mutate(householdId)}
      />
    </div>
  );
}
