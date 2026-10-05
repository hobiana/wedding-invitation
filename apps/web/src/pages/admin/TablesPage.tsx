import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettingsDto, CreateTableDto, TableDto, UpdateTableDto } from "@invitation-app/shared";
import { api, HOUSEHOLDS_MAX_LIMIT, listHouseholds } from "@/lib/api";
import { HouseholdsTruncationNotice } from "@/components/HouseholdsTruncationNotice";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { EnTetePlanDeTable } from "@/components/plan-de-table/EnTetePlanDeTable";
import { PlanDeTableBureau } from "@/components/plan-de-table/PlanDeTableBureau";
import { PlanDeTableTelephone } from "@/components/plan-de-table/PlanDeTableTelephone";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { bilan, foyersAPlacer } from "@/lib/plan-de-table";

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

  const aPlacer = tables && households ? foyersAPlacer(households, tables) : [];
  // Les mêmes données et les mêmes rappels pour les deux écrans.
  const rappels = {
    onAssign: (tableId: string, householdId: string) => assignMutation.mutate({ tableId, householdId }),
    onUnassign: (householdId: string) => unassignMutation.mutate(householdId),
    onCreateTable: (dto: CreateTableDto) => createTable.mutateAsync(dto).then(() => true, () => false),
    onUpdateTable: (id: string, dto: UpdateTableDto) =>
      updateTable.mutateAsync({ id, dto }).then(() => true, () => false),
    onDeleteTable: setTableASupprimer,
  };

  if (bureau) {
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
          <PlanDeTableBureau tables={tables} aPlacer={aPlacer} {...rappels} />
        )}
        {dialogueDeSuppression}
      </div>
    );
  }

  // Téléphone. Le titre et le bilan appartiennent à `PlanDeTableTelephone` ;
  // pendant le chargement et en cas d'échec, le titre seul tient leur place,
  // pour que la page ne commence pas par un trou.
  const titreSeul = <h1 className="mb-5 font-display text-4xl leading-tight text-ink">Plan de table</h1>;
  return (
    <div className="space-y-4 px-4 py-6">
      {avertissementDeTroncature}
      {statutDeChargement}
      {chargement ? (
        <div>
          {titreSeul}
          <Skeleton className="h-12 w-full" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-17 w-full" />
            ))}
          </div>
        </div>
      ) : echecDeChargement || !tables ? (
        <div>
          {titreSeul}
          {echec}
        </div>
      ) : (
        <PlanDeTableTelephone tables={tables} aPlacer={aPlacer} {...rappels} />
      )}
      {dialogueDeSuppression}
    </div>
  );
}
