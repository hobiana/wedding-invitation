import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettingsDto, CreateTableDto, TableDto, UpdateTableDto } from "@invitation-app/shared";
import { api, HOUSEHOLDS_MAX_LIMIT, listHouseholds } from "@/lib/api";
import { HouseholdsTruncationNotice } from "@/components/HouseholdsTruncationNotice";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { TableBoard } from "@/components/TableBoard";
import { EnTetePlanDeTable } from "@/components/plan-de-table/EnTetePlanDeTable";
import { PlanDeTableBureau } from "@/components/plan-de-table/PlanDeTableBureau";
import { places } from "@/lib/accord";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { bilan, CAPACITE_INVALIDE, capaciteValide, foyersAPlacer } from "@/lib/plan-de-table";

const DEFAULT_CAPACITY = 10;

interface TableDraft {
  id: string;
  name: string;
  capacity: string;
}

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

/** « Les 2 foyers placés à cette table reviendront dans À placer. » — accordé. */
function devenirDesFoyers(table: TableDto): string {
  const n = table.households.length;
  if (n === 0) return "Cette table est vide.";
  return `${
    n === 1 ? "Le foyer placé à cette table reviendra" : `Les ${n} foyers placés à cette table reviendront`
  } dans À placer. Aucun foyer n'est supprimé.`;
}

export function TablesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bureau = useMediaQuery("(min-width: 768px)");
  const [tableASupprimer, setTableASupprimer] = useState<TableDto | null>(null);

  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get<TableDto[]>("/admin/tables"),
  });
  // Toute la liste, au plafond de l'API : les non-placés se déduisent de tous
  // les foyers, pas d'une page. Clé paramétrée, pour ne pas se confondre avec
  // une page de l'écran Foyers.
  const parametresFoyers = { limit: HOUSEHOLDS_MAX_LIMIT };
  const householdsQuery = useQuery({
    queryKey: ["households", parametresFoyers],
    queryFn: () => listHouseholds(parametresFoyers),
  });
  // Seulement pour l'étiquette « Réception · 2 janvier » : un échec l'efface,
  // il ne bloque rien.
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AdminSettingsDto>("/admin/settings"),
  });
  const tables = tablesQuery.data;
  const households = householdsQuery.data?.items;
  const chargement = tablesQuery.isPending || householdsQuery.isPending;
  const echecDeChargement = tablesQuery.isError || householdsQuery.isError;
  const dateDuMariage = typeof settingsQuery.data?.weddingDate === "string" ? settingsQuery.data.weddingDate : null;

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

  // Chaque geste se confirme ou se refuse dans un toast, en français. Le cache
  // est invalidé dans tous les cas : un refus veut dire que l'écran ne disait
  // plus l'état réel.
  const createTable = useMutation({
    mutationFn: (dto: CreateTableDto) => api.post("/admin/tables", dto),
    onSuccess: (_resultat, dto) => toast({ message: `La table « ${dto.name} » est créée.` }),
    onError: () => toast({ message: ECHECS.creation, tone: "error" }),
    onSettled: refreshBoard,
  });

  const updateTable = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTableDto }) => api.patch(`/admin/tables/${id}`, dto),
    onSuccess: (_resultat, { id, dto }) =>
      toast({ message: `La table « ${dto.name ?? nomDeTable(id)} » est modifiée.` }),
    onError: (_err, { id }) => toast({ message: ECHECS.modification(nomDeTable(id)), tone: "error" }),
    onSettled: refreshBoard,
  });

  const deleteTable = useMutation({
    mutationFn: (table: TableDto) => api.delete(`/admin/tables/${table.id}`),
    onSuccess: (_resultat, table) => toast({ message: `La table « ${table.name} » est supprimée.` }),
    onError: (_err, table) => toast({ message: ECHECS.suppression(table.name), tone: "error" }),
    onSettled: refreshBoard,
  });

  const assignMutation = useMutation({
    mutationFn: ({ tableId, householdId }: { tableId: string; householdId: string }) =>
      api.patch(`/admin/tables/${tableId}/assign/${householdId}`),
    onSuccess: (_resultat, { tableId, householdId }) =>
      toast({ message: `Le foyer ${nomDeFoyer(householdId)} est placé à la table « ${nomDeTable(tableId)} ».` }),
    onError: (_err, { tableId, householdId }) =>
      toast({ message: ECHECS.placement(nomDeFoyer(householdId), nomDeTable(tableId)), tone: "error" }),
    onSettled: refreshBoard,
  });

  const unassignMutation = useMutation({
    mutationFn: (householdId: string) => api.patch(`/admin/tables/unassign/${householdId}`),
    onSuccess: (_resultat, householdId) => {
      // Lu avant le rechargement (`onSettled`) : le plan en cache dit encore
      // de quelle table il part.
      const depuis = tables?.find((t) => t.households.some((h) => h.id === householdId));
      const assis = depuis?.households.find((h) => h.id === householdId);
      const debut = depuis
        ? `Le foyer ${nomDeFoyer(householdId)} est retiré de la table « ${depuis.name} »`
        : `Le foyer ${nomDeFoyer(householdId)} est retiré de sa table`;
      // Un foyer qui a décliné ne revient pas dans « À placer » : il y est masqué.
      toast({ message: assis?.status === "DECLINED" ? `${debut}.` : `${debut} et revient dans À placer.` });
    },
    onError: (_err, householdId) => toast({ message: ECHECS.retrait(nomDeFoyer(householdId)), tone: "error" }),
    onSettled: refreshBoard,
  });

  const avertissementDeTroncature = householdsQuery.data && (
    <HouseholdsTruncationNotice
      recus={householdsQuery.data.items.length}
      total={householdsQuery.data.total}
      consequence="des foyers non placés peuvent manquer à la liste"
    />
  );

  const dialogueDeSuppression = tableASupprimer && (
    <AlertDialog
      open
      onOpenChange={(ouvert) => !ouvert && setTableASupprimer(null)}
      title={`Supprimer ${tableASupprimer.name} ?`}
      description={devenirDesFoyers(tableASupprimer)}
      confirmLabel="Supprimer la table"
      onConfirm={() => {
        deleteTable.mutate(tableASupprimer);
        setTableASupprimer(null);
      }}
    />
  );

  // Toujours présente, pour qu'un lecteur d'écran l'écoute avant qu'elle parle.
  const statutDeChargement = (
    <p role="status" className="sr-only">
      {chargement ? "Chargement du plan de table…" : ""}
    </p>
  );

  const echec = (
    <p role="alert" className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700">
      Le plan de table n'a pas pu être chargé. Vérifiez votre connexion, puis rechargez la page.
    </p>
  );

  if (bureau) {
    const aPlacer = tables && households ? foyersAPlacer(households, tables) : [];
    return (
      <div className="space-y-8 p-6 md:p-8">
        <EnTetePlanDeTable dateDuMariage={dateDuMariage} bilan={tables && households ? bilan(tables, aPlacer) : null} />
        {avertissementDeTroncature}
        {statutDeChargement}
        {chargement ? (
          <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-56 w-full" />
              ))}
            </div>
          </div>
        ) : echecDeChargement || !tables ? (
          echec
        ) : (
          <PlanDeTableBureau
            tables={tables}
            aPlacer={aPlacer}
            onAssign={(tableId, householdId) => assignMutation.mutate({ tableId, householdId })}
            onUnassign={(householdId) => unassignMutation.mutate(householdId)}
            onCreateTable={(dto) => createTable.mutateAsync(dto).then(() => true, () => false)}
            onUpdateTable={(id, dto) => updateTable.mutateAsync({ id, dto }).then(() => true, () => false)}
            onDeleteTable={setTableASupprimer}
          />
        )}
        {dialogueDeSuppression}
      </div>
    );
  }

  return (
    <TelephoneProvisoire
      tables={tables}
      chargement={chargement}
      echec={echecDeChargement ? echec : null}
      avertissement={avertissementDeTroncature}
      statut={statutDeChargement}
      dialogue={dialogueDeSuppression}
      creationEnCours={createTable.isPending}
      modificationEnCours={updateTable.isPending}
      onCreer={(dto, apres) => createTable.mutate(dto, { onSuccess: apres })}
      onModifier={(id, dto, apres) => updateTable.mutate({ id, dto }, { onSuccess: apres })}
      onDemanderSuppression={setTableASupprimer}
      onAssign={(tableId, householdId) => assignMutation.mutate({ tableId, householdId })}
      onUnassign={(householdId) => unassignMutation.mutate(householdId)}
      // Les props de `TableBoard` restent celles d'avant : tous les non-placés,
      // déclinés compris. L'écran téléphone de la maquette les remplacera.
      unassignedHouseholds={(households ?? []).filter(
        (h) => !(tables ?? []).some((t) => t.households.some((assis) => assis.id === h.id)),
      )}
    />
  );
}

/**
 * PROVISOIRE — l'ancienne composition du téléphone, gardée telle quelle en
 * attendant l'écran téléphone des maquettes (onglets, feuille du bas), confié à
 * un autre lot. Seuls changements : les messages passent par les toasts, et la
 * logique partagée (`capaciteValide`) vient de `lib/plan-de-table`.
 */
function TelephoneProvisoire({
  tables,
  chargement,
  echec,
  avertissement,
  statut,
  dialogue,
  creationEnCours,
  modificationEnCours,
  onCreer,
  onModifier,
  onDemanderSuppression,
  onAssign,
  onUnassign,
  unassignedHouseholds,
}: {
  tables: TableDto[] | undefined;
  chargement: boolean;
  echec: ReactNode;
  avertissement: ReactNode;
  statut: ReactNode;
  dialogue: ReactNode;
  creationEnCours: boolean;
  modificationEnCours: boolean;
  onCreer: (dto: CreateTableDto, apres: () => void) => void;
  onModifier: (id: string, dto: UpdateTableDto, apres: () => void) => void;
  onDemanderSuppression: (table: TableDto) => void;
  onAssign: (tableId: string, householdId: string) => void;
  onUnassign: (householdId: string) => void;
  unassignedHouseholds: ComponentProps<typeof TableBoard>["unassignedHouseholds"];
}) {
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(String(DEFAULT_CAPACITY));
  const [creationTentee, setCreationTentee] = useState(false);
  const [editing, setEditing] = useState<TableDraft | null>(null);

  const capaciteCreation = capaciteValide(newTableCapacity);
  const erreurCapaciteCreation = creationTentee && capaciteCreation === null ? CAPACITE_INVALIDE : null;

  function creer(evenement: FormEvent) {
    evenement.preventDefault();
    setCreationTentee(true);
    if (!newTableName.trim() || capaciteCreation === null) return;
    onCreer({ name: newTableName.trim(), capacity: capaciteCreation }, () => {
      setNewTableName("");
      setNewTableCapacity(String(DEFAULT_CAPACITY));
      setCreationTentee(false);
    });
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
        <Button type="submit" className="mt-7" disabled={!newTableName.trim() || creationEnCours}>
          Ajouter une table
        </Button>
      </form>

      {avertissement}
      {statut}

      {chargement ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : echec ? (
        echec
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
                      enCours={modificationEnCours}
                      onEnregistrer={(capacity) =>
                        onModifier(table.id, { name: editing.name.trim(), capacity }, () => setEditing(null))
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
                      onClick={() => setEditing({ id: table.id, name: table.name, capacity: String(table.capacity) })}
                    >
                      Modifier
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDemanderSuppression(table)}>
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
            onAssign={onAssign}
            onUnassign={onUnassign}
          />
        </>
      )}

      {dialogue}
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
