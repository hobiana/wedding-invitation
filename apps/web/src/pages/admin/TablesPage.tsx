import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTableDto, HouseholdAdminDto, TableDto, UpdateTableDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TableBoard } from "@/components/TableBoard";
import { places } from "@/lib/accord";

const DEFAULT_CAPACITY = 10;

interface TableDraft {
  id: string;
  name: string;
  capacity: string;
}

/**
 * La capacité saisie, ou `null` si elle ne vaut pas une table. Gardée en texte
 * dans l'état : un champ numérique vidé vaut `""`, et `Number("")` donnerait 0
 * sans que l'organisateur l'ait tapé.
 */
function capaciteValide(saisie: string): number | null {
  const n = Number(saisie);
  return saisie.trim() !== "" && Number.isInteger(n) && n >= 1 ? n : null;
}

const CAPACITE_INVALIDE = "La capacité doit être d'au moins 1 place.";

/**
 * Les messages d'échec, en français et écrits ici.
 *
 * L'API répond en anglais (« has 2 seat(s) left… ») : recopier `err.message`
 * affichait de l'anglais dans une interface qui est en français sans exception.
 * `api.ts` ne transmet pas le statut HTTP, donc ces phrases ne prétendent pas
 * connaître la cause exacte — elles disent ce qui a échoué, la cause probable,
 * et que le plan affiché est désormais l'état réel.
 */
//
// Les noms sont toujours précédés de « le foyer » et « la table » : un nom
// propre seul ne dit pas son genre (« Famille Rabe est placé »), le nom commun
// l'impose.
const ECHECS = {
  creation: "La table n'a pas pu être créée. Vérifiez son nom et sa capacité, puis réessayez.",
  modification: (table: string) =>
    `La table « ${table} » n'a pas pu être modifiée. Si vous avez baissé sa capacité, elle ne peut pas descendre sous les places déjà occupées par ses foyers.`,
  suppression: (table: string) => `La table « ${table} » n'a pas pu être supprimée. Réessayez dans un instant.`,
  placement: (foyer: string, table: string) =>
    `Le foyer ${foyer} n'a pas pu être placé à la table « ${table} » : elle n'a sans doute plus assez de places. Le plan vient d'être rechargé.`,
  retrait: (foyer: string) =>
    `Le foyer ${foyer} n'a pas pu être retiré de sa table. Le plan vient d'être rechargé.`,
};

export function TablesPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(String(DEFAULT_CAPACITY));
  const [creationTentee, setCreationTentee] = useState(false);
  const [editing, setEditing] = useState<TableDraft | null>(null);
  const [tableASupprimer, setTableASupprimer] = useState<TableDto | null>(null);

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get<TableDto[]>("/admin/tables"),
  });
  const householdsQuery = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });
  const tables = tablesQuery.data;
  const households = householdsQuery.data;
  const chargement = tablesQuery.isPending || householdsQuery.isPending;
  const echecDeChargement = tablesQuery.isError || householdsQuery.isError;

  function nomDeTable(id: string) {
    return tables?.find((t) => t.id === id)?.name ?? id;
  }
  function nomDeFoyer(id: string) {
    return households?.find((h) => h.id === id)?.displayName ?? id;
  }

  function refreshBoard() {
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    queryClient.invalidateQueries({ queryKey: ["households"] });
  }

  /** Chaque geste repart d'un écran sans message périmé. */
  function nouveauGeste() {
    setError(null);
    setAnnonce(null);
  }

  const createTable = useMutation({
    mutationFn: (dto: CreateTableDto) => api.post("/admin/tables", dto),
    onMutate: nouveauGeste,
    onSuccess: (_resultat, dto) => {
      setNewTableName("");
      setNewTableCapacity(String(DEFAULT_CAPACITY));
      setCreationTentee(false);
      setAnnonce(`La table « ${dto.name} » est créée.`);
    },
    onError: () => setError(ECHECS.creation),
    onSettled: refreshBoard,
  });

  // The API has always exposed PATCH/DELETE on a table; nothing in the UI
  // reached them, so a table could only ever be created, never corrected.
  const updateTable = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTableDto }) => api.patch(`/admin/tables/${id}`, dto),
    onMutate: nouveauGeste,
    onSuccess: () => setEditing(null),
    onError: (_err, { id }) => setError(ECHECS.modification(nomDeTable(id))),
    onSettled: refreshBoard,
  });

  const deleteTable = useMutation({
    mutationFn: (table: TableDto) => api.delete(`/admin/tables/${table.id}`),
    onMutate: nouveauGeste,
    onSuccess: (_resultat, table) => setAnnonce(`La table « ${table.name} » est supprimée.`),
    onError: (_err, table) => setError(ECHECS.suppression(table.name)),
    onSettled: refreshBoard,
  });

  // Un refus recharge le plan autant qu'un succès : s'il a été refusé, c'est
  // que l'écran ne disait plus l'état réel.
  const assignMutation = useMutation({
    mutationFn: ({ tableId, householdId }: { tableId: string; householdId: string }) =>
      api.patch(`/admin/tables/${tableId}/assign/${householdId}`),
    onMutate: nouveauGeste,
    onSuccess: (_resultat, { tableId, householdId }) =>
      setAnnonce(`Le foyer ${nomDeFoyer(householdId)} est placé à la table « ${nomDeTable(tableId)} ».`),
    onError: (_err, { tableId, householdId }) =>
      setError(ECHECS.placement(nomDeFoyer(householdId), nomDeTable(tableId))),
    onSettled: refreshBoard,
  });

  const unassignMutation = useMutation({
    mutationFn: (householdId: string) => api.patch(`/admin/tables/unassign/${householdId}`),
    onMutate: nouveauGeste,
    onSuccess: (_resultat, householdId) => setAnnonce(`Le foyer ${nomDeFoyer(householdId)} est retiré de sa table.`),
    onError: (_err, householdId) => setError(ECHECS.retrait(nomDeFoyer(householdId))),
    onSettled: refreshBoard,
  });

  // A household is "unassigned" only if it doesn't appear in ANY table's households array.
  const assignedIds = new Set(tables?.flatMap((t) => t.households.map((h) => h.id)) ?? []);
  const unassignedHouseholds = (households ?? []).filter((h) => !assignedIds.has(h.id));

  const capaciteCreation = capaciteValide(newTableCapacity);
  const erreurCapaciteCreation = creationTentee && capaciteCreation === null ? CAPACITE_INVALIDE : null;

  function creer(evenement: FormEvent) {
    evenement.preventDefault();
    setCreationTentee(true);
    if (!newTableName.trim() || capaciteCreation === null) return;
    createTable.mutate({ name: newTableName.trim(), capacity: capaciteCreation });
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <h1 className="font-display text-2xl text-ink">Plan de table</h1>

      <form onSubmit={creer} className="flex flex-wrap items-start gap-3" noValidate>
        <Field label="Nom de la table" className="min-w-48 flex-1 sm:flex-none">
          <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Table des témoins" />
        </Field>
        <Field label="Capacité" error={erreurCapaciteCreation} className="w-28">
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(e.target.value)}
          />
        </Field>
        {/* Aligné sur les champs : la hauteur du libellé, puis le bouton. */}
        <Button type="submit" className="mt-7" disabled={!newTableName.trim() || createTable.isPending}>
          Ajouter une table
        </Button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          {error}
        </p>
      )}

      {/*
        Toujours présente, pour qu'un lecteur d'écran l'écoute avant qu'elle
        parle. Au téléphone, un foyer placé part dans une table repliée : sans
        cette phrase, il disparaît de l'écran sans que rien dise où.
      */}
      <p role="status" className={chargement ? "sr-only" : "text-sm text-ink-muted"}>
        {chargement ? "Chargement du plan de table…" : annonce}
      </p>

      {chargement ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : echecDeChargement ? (
        <p
          role="alert"
          className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          Le plan de table n'a pas pu être chargé. Vérifiez votre connexion, puis rechargez la page.
        </p>
      ) : !tables || tables.length === 0 ? (
        <EmptyState
          title="Aucune table"
          description="Créez la première table ci-dessus ; les foyers pourront ensuite y être placés."
        />
      ) : (
        <>
          <section aria-labelledby="titre-tables" className="space-y-2">
            <h2 id="titre-tables" className="font-medium text-ink">
              Tables
            </h2>
            <ul className="divide-y divide-rule rounded-surface border border-rule bg-ivory">
              {tables.map((table) =>
                editing?.id === table.id ? (
                  <li key={table.id}>
                    <EditionDeTable
                      table={table}
                      brouillon={editing}
                      onChange={setEditing}
                      enCours={updateTable.isPending}
                      onEnregistrer={(capacity) =>
                        updateTable.mutate({ id: table.id, dto: { name: editing.name.trim(), capacity } })
                      }
                      onAnnuler={() => setEditing(null)}
                    />
                  </li>
                ) : (
                  <li key={table.id} className="flex flex-wrap items-center gap-2 p-3">
                    <span className="flex-1 text-ink">
                      {table.name} — {places(table.capacity)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditing({ id: table.id, name: table.name, capacity: String(table.capacity) })
                      }
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

          <TableBoard
            tables={tables}
            unassignedHouseholds={unassignedHouseholds}
            onAssign={(tableId, householdId) => assignMutation.mutate({ tableId, householdId })}
            onUnassign={(householdId) => unassignMutation.mutate(householdId)}
          />
        </>
      )}

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
            deleteTable.mutate(tableASupprimer);
            setTableASupprimer(null);
          }}
        />
      )}
    </div>
  );
}

function EditionDeTable({
  table,
  brouillon,
  onChange,
  enCours,
  onEnregistrer,
  onAnnuler,
}: {
  table: TableDto;
  brouillon: TableDraft;
  onChange: (brouillon: TableDraft) => void;
  enCours: boolean;
  onEnregistrer: (capacite: number) => void;
  onAnnuler: () => void;
}) {
  const [tentee, setTentee] = useState(false);
  const capacite = capaciteValide(brouillon.capacity);

  function enregistrer(evenement: FormEvent) {
    evenement.preventDefault();
    setTentee(true);
    if (!brouillon.name.trim() || capacite === null) return;
    onEnregistrer(capacite);
  }

  return (
    <form onSubmit={enregistrer} className="flex flex-wrap items-start gap-3 p-3" noValidate>
      <Field label={`Nom de ${table.name}`} className="min-w-48 flex-1">
        <Input value={brouillon.name} onChange={(e) => onChange({ ...brouillon, name: e.target.value })} />
      </Field>
      <Field
        label={`Capacité de ${table.name}`}
        error={tentee && capacite === null ? CAPACITE_INVALIDE : null}
        className="w-36"
      >
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={brouillon.capacity}
          onChange={(e) => onChange({ ...brouillon, capacity: e.target.value })}
        />
      </Field>
      <div className="mt-7 flex gap-2">
        <Button type="submit" disabled={!brouillon.name.trim() || enCours}>
          Enregistrer
        </Button>
        <Button type="button" variant="outline" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
