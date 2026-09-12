import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTableDto, HouseholdAdminDto, TableDto, UpdateTableDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { TableBoard } from "@/components/TableBoard";

const DEFAULT_CAPACITY = 10;

interface TableDraft {
  id: string;
  name: string;
  capacity: number;
}

export function TablesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(DEFAULT_CAPACITY);
  const [editing, setEditing] = useState<TableDraft | null>(null);
  const [tableASupprimer, setTableASupprimer] = useState<TableDto | null>(null);

  const { data: tables } = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get<TableDto[]>("/admin/tables"),
  });
  const { data: households } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  function refreshBoard() {
    setError(null);
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    queryClient.invalidateQueries({ queryKey: ["households"] });
  }

  const createTable = useMutation({
    mutationFn: (dto: CreateTableDto) => api.post("/admin/tables", dto),
    onSuccess: () => {
      refreshBoard();
      setNewTableName("");
      setNewTableCapacity(DEFAULT_CAPACITY);
    },
    onError: (err: Error) => setError(err.message),
  });

  // The API has always exposed PATCH/DELETE on a table; nothing in the UI
  // reached them, so a table could only ever be created, never corrected.
  const updateTable = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTableDto }) => api.patch(`/admin/tables/${id}`, dto),
    onSuccess: () => {
      refreshBoard();
      setEditing(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tables/${id}`),
    onSuccess: refreshBoard,
    onError: (err: Error) => setError(err.message),
  });

  const assignMutation = useMutation({
    mutationFn: ({ tableId, householdId }: { tableId: string; householdId: string }) =>
      api.patch(`/admin/tables/${tableId}/assign/${householdId}`),
    onSuccess: refreshBoard,
    onError: (err: Error) => setError(err.message),
  });

  const unassignMutation = useMutation({
    mutationFn: (householdId: string) => api.patch(`/admin/tables/unassign/${householdId}`),
    onSuccess: refreshBoard,
    onError: (err: Error) => setError(err.message),
  });

  // A household is "unassigned" only if it doesn't appear in ANY table's households array.
  const assignedIds = new Set(tables?.flatMap((t) => t.households.map((h) => h.id)) ?? []);
  const unassignedHouseholds = (households ?? []).filter((h) => !assignedIds.has(h.id));

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Plan de table</h1>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="newTableName" className="text-sm font-medium">Nom de la table</label>
          <input
            id="newTableName"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Nom de la table"
            className="border rounded-md px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="newTableCapacity" className="text-sm font-medium">Capacité</label>
          <input
            id="newTableCapacity"
            type="number"
            min={1}
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(Number(e.target.value))}
            className="w-24 border rounded-md px-3 py-2"
          />
        </div>
        <Button
          onClick={() => createTable.mutate({ name: newTableName, capacity: newTableCapacity })}
          disabled={!newTableName}
        >
          Ajouter une table
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tables && tables.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Tables</h2>
          <ul className="divide-y border rounded-lg">
            {tables.map((table) =>
              editing?.id === table.id ? (
                <li key={table.id} className="flex flex-wrap items-center gap-2 p-3">
                  <input
                    aria-label={`Nom de ${table.name}`}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="border rounded-md px-3 py-1.5"
                  />
                  <input
                    aria-label={`Capacité de ${table.name}`}
                    type="number"
                    min={1}
                    value={editing.capacity}
                    onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })}
                    className="w-24 border rounded-md px-3 py-1.5"
                  />
                  <Button
                    size="sm"
                    disabled={!editing.name || updateTable.isPending}
                    onClick={() =>
                      updateTable.mutate({
                        id: table.id,
                        dto: { name: editing.name, capacity: editing.capacity },
                      })
                    }
                  >
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                    Annuler
                  </Button>
                </li>
              ) : (
                <li key={table.id} className="flex flex-wrap items-center gap-2 p-3">
                  <span className="flex-1">
                    {table.name} — {table.capacity} place{table.capacity > 1 ? "s" : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing({ id: table.id, name: table.name, capacity: table.capacity })}
                  >
                    Modifier
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setTableASupprimer(table)}>
                    Supprimer
                  </Button>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <TableBoard
        tables={tables ?? []}
        unassignedHouseholds={unassignedHouseholds}
        onAssign={(tableId, householdId) => assignMutation.mutate({ tableId, householdId })}
        onUnassign={(householdId) => unassignMutation.mutate(householdId)}
      />

      {tableASupprimer && (
        <AlertDialog
          open
          onOpenChange={(ouvert) => !ouvert && setTableASupprimer(null)}
          title={`Supprimer ${tableASupprimer.name} ?`}
          description={
            tableASupprimer.households.length > 0
              ? // Une table à un seul foyer disait « Les 1 foyers placés » : la
                // même faute d'accord que côté foyers, dans une interface qui
                // est en français sans exception.
                `${
                  tableASupprimer.households.length === 1
                    ? "Le foyer placé à cette table reviendra"
                    : `Les ${tableASupprimer.households.length} foyers placés à cette table reviendront`
                } aux foyers non placés. Aucun foyer n'est supprimé.`
              : "Cette table est vide."
          }
          confirmLabel="Supprimer la table"
          onConfirm={() => {
            deleteTable.mutate(tableASupprimer.id);
            setTableASupprimer(null);
          }}
        />
      )}
    </div>
  );
}
