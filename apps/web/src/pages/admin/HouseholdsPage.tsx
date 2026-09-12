import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateHouseholdDto,
  HouseholdAdminDto,
  RsvpStatus,
  UpdateHouseholdDto,
} from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { HouseholdFormDialog } from "@/components/HouseholdFormDialog";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { HouseholdDetail } from "@/components/HouseholdDetail";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { filterHouseholds } from "@/lib/filter-households";

export function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdAdminDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState<RsvpStatus | "ALL">("ALL");
  const [aSupprimer, setASupprimer] = useState<HouseholdAdminDto | null>(null);

  const { data: households, isPending } = useQuery({
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

  const visibles = useMemo(
    () => filterHouseholds(households ?? [], { query: recherche, status: statut }),
    [households, recherche, statut],
  );

  /**
   * Ce que la suppression détruit, dit en toutes lettres. Un foyer qui a répondu
   * emporte sa réponse, et sa réponse ne se redemande pas : c'est la phrase qui
   * distingue ce garde-fou d'un « Êtes-vous sûr ? ».
   */
  function descriptionDeSuppression(foyer: HouseholdAdminDto): string {
    const lien = "Son lien d'invitation cessera de fonctionner.";
    if (foyer.status === "CONFIRMED" && foyer.confirmedCount !== null) {
      // Un foyer d'une personne est le cas courant après le couple, et
      // « a confirmé 1 personnes » est une faute dans une interface qui est
      // en français sans exception.
      const personnes = foyer.confirmedCount > 1 ? "personnes" : "personne";
      return `Ce foyer a confirmé ${foyer.confirmedCount} ${personnes}. Supprimer efface sa réponse, et son lien cessera de fonctionner.`;
    }
    if (foyer.status === "DECLINED") {
      return `Ce foyer a décliné l'invitation. Supprimer efface sa réponse, et son lien cessera de fonctionner.`;
    }
    return `Ce foyer n'a pas encore répondu. ${lien}`;
  }

  const colonnes: Column<HouseholdAdminDto>[] = [
    { id: "nom", header: "Foyer", cell: (h) => <span className="font-medium">{h.displayName}</span> },
    // `confirmedCount` reste `null` tant que le foyer n'a pas répondu : « — »
    // porte cette distinction, jamais « 0 » qui dirait « personne ne vient ».
    { id: "places", header: "Places", cell: (h) => `${h.confirmedCount ?? "—"} / ${h.allocatedSeats}` },
    { id: "statut", header: "Statut", cell: (h) => <StatusBadge status={h.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: (h) => (
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton linkId={h.id} householdName={h.displayName} />
          <Button variant="outline" size="sm" onClick={() => setEditing(h)}>
            Modifier
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setASupprimer(h)}>
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Foyers invités</h1>
        <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field label="Rechercher un foyer">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom du foyer ou d'un invité"
          />
        </Field>
        <Field label="Statut">
          <Select value={statut} onChange={(e) => setStatut(e.target.value as RsvpStatus | "ALL")}>
            <option value="ALL">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="CONFIRMED">Confirmés</option>
            <option value="DECLINED">Déclinés</option>
          </Select>
        </Field>
      </div>

      {isPending ? (
        <div className="space-y-2">
          <p role="status" className="sr-only">
            Chargement des foyers…
          </p>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <EmptyState
          title={households?.length ? "Aucun foyer ne correspond" : "Aucun foyer"}
          description={
            households?.length
              ? "Essayez un autre nom, ou remettez le statut sur « Tous »."
              : "Ajoutez le premier foyer pour commencer à distribuer les invitations."
          }
          action={!households?.length && <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>}
        />
      ) : (
        <DataTable
          caption="Foyers invités"
          columns={colonnes}
          rows={visibles}
          rowKey={(h) => h.id}
          detail={(h) => <HouseholdDetail household={h} />}
          detailLabel={(h) => `Détail de ${h.displayName}`}
        />
      )}

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
      {aSupprimer && (
        <AlertDialog
          open
          onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}
          title={`Supprimer le foyer ${aSupprimer.displayName} ?`}
          description={descriptionDeSuppression(aSupprimer)}
          confirmLabel="Supprimer le foyer"
          onConfirm={() => {
            deleteMutation.mutate(aSupprimer.id);
            setASupprimer(null);
          }}
        />
      )}
    </div>
  );
}
