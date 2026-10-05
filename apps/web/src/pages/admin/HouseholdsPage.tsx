import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import type {
  CreateHouseholdDto,
  HouseholdAdminDto,
  HouseholdSortKey,
  RsvpStatus,
  SortOrder,
  UpdateHouseholdDto,
} from "@invitation-app/shared";
import { api, listHouseholds } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZES } from "@/components/ui/page-sizes";
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
const TAILLE_PAR_DEFAUT = 25;
const CLE_TAILLE = "foyers.parPage";
/** Le temps d'une pause de frappe : une requête par mot, pas une par lettre. */
const DELAI_RECHERCHE_MS = 300;

/**
 * La taille de page retenue, ou 25. Le stockage peut lever — navigation privée
 * stricte, stockage désactivé — et une valeur lue peut être n'importe quoi :
 * l'écran ne dépend ni de l'un ni de l'autre.
 */
function tailleRetenue(): number {
  try {
    const lue = Number(window.localStorage.getItem(CLE_TAILLE));
    return (PAGE_SIZES as readonly number[]).includes(lue) ? lue : TAILLE_PAR_DEFAUT;
  } catch {
    return TAILLE_PAR_DEFAUT;
  }
}

function retenirTaille(taille: number) {
  try {
    window.localStorage.setItem(CLE_TAILLE, String(taille));
  } catch {
    // Sans stockage, la taille vaut pour cette visite seulement.
  }
}

const TRIS: { valeur: HouseholdSortKey; libelle: string }[] = [
  { valeur: "name", libelle: "Nom du foyer" },
  { valeur: "seats", libelle: "Places" },
  { valeur: "status", libelle: "Statut" },
  { valeur: "createdAt", libelle: "Date d'ajout" },
];

/**
 * Les échecs, en français et écrits ici : l'API répond en anglais, et
 * recopier `err.message` l'afficherait tel quel. `api.ts` ne transmet pas le
 * statut HTTP, donc ces phrases disent ce qui a échoué et la cause probable,
 * sans prétendre la connaître.
 */
const ECHECS = {
  creation: "Le foyer n'a pas pu être ajouté. Vérifiez son nom et son nombre de places, puis réessayez.",
  modification: (foyer: string) =>
    `Les modifications du foyer ${foyer} n'ont pas pu être enregistrées. Les personnes confirmées ne peuvent pas dépasser les places allouées, et sa table doit avoir la place de l'accueillir.`,
  suppression: (foyer: string) => `Le foyer ${foyer} n'a pas pu être supprimé. Réessayez dans un instant.`,
};

export function HouseholdsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdAdminDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState("");
  const [statut, setStatut] = useState<RsvpStatus | "ALL">("ALL");
  const [tri, setTri] = useState<HouseholdSortKey>("name");
  const [sens, setSens] = useState<SortOrder>("asc");
  const [limit, setLimit] = useState(tailleRetenue);
  const [offset, setOffset] = useState(0);
  // Indexé par id de foyer, jamais remis à zéro au changement de page : un
  // foyer déplié l'est encore quand on y revient (décision du commanditaire).
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(() => new Set());
  const [aSupprimer, setASupprimer] = useState<HouseholdAdminDto | null>(null);

  // La recherche part après une pause de frappe, et ramène à la première page
  // dans le même rendu — jamais une requête « nouvelle recherche, page 3 ».
  // La comparaison se fait contre une ref, pas contre l'état : le minuteur posé
  // au montage tire 300 ms plus tard et ne doit pas ramener à la page 1 un
  // organisateur qui a cliqué « Suivant » entre-temps.
  const derniereEnvoyee = useRef("");
  useEffect(() => {
    const minuteur = window.setTimeout(() => {
      const nettoyee = recherche.trim();
      if (nettoyee === derniereEnvoyee.current) return;
      derniereEnvoyee.current = nettoyee;
      setRechercheEnvoyee(nettoyee);
      setOffset(0);
    }, DELAI_RECHERCHE_MS);
    return () => window.clearTimeout(minuteur);
  }, [recherche]);

  const parametres = {
    q: rechercheEnvoyee || undefined,
    status: statut === "ALL" ? undefined : statut,
    sort: tri,
    order: sens,
    limit,
    offset,
  };

  const {
    data: page,
    isPending,
    isError,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["households", parametres],
    queryFn: () => listHouseholds(parametres),
    // La page affichée reste à l'écran pendant que la suivante arrive : pas de
    // squelettes à chaque clic sur « Suivant ».
    placeholderData: keepPreviousData,
  });

  // Une page vidée sous nos pieds — le dernier foyer de la dernière page vient
  // d'être supprimé — recule à la dernière page qui existe, plutôt que de
  // laisser croire qu'il n'y a aucun foyer.
  const pageVidee = !isPlaceholderData && page !== undefined && page.items.length === 0 && page.total > 0 && offset > 0;
  useEffect(() => {
    if (pageVidee && page) setOffset(Math.max(0, Math.floor((page.total - 1) / limit) * limit));
  }, [pageVidee, page, limit]);

  function basculer(id: string) {
    setOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  // En préfixe : toutes les pages, toutes les recherches, et les listes du
  // tableau de bord et du plan de table, qui commencent par la même clé.
  function rafraichirFoyers() {
    queryClient.invalidateQueries({ queryKey: ["households"] });
  }

  const createMutation = useMutation({
    mutationFn: (dto: CreateHouseholdDto) => api.post("/admin/households", dto),
    onSuccess: () => {
      setError(null);
      rafraichirFoyers();
      setDialogOpen(false);
    },
    onError: () => setError(ECHECS.creation),
  });

  // Admins can always correct RSVP data, including past the guest-facing
  // deadline — the API allowed it all along, but nothing in the UI reached it.
  const updateMutation = useMutation({
    // `nom` voyage avec la requête : c'est le nom d'avant la modification, celui
    // que l'organisateur reconnaît dans la liste.
    mutationFn: ({ id, dto }: { id: string; nom: string; dto: UpdateHouseholdDto }) =>
      api.patch(`/admin/households/${id}`, dto),
    onSuccess: () => {
      setError(null);
      rafraichirFoyers();
      // The seating board reads seats from the household list.
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setEditing(null);
    },
    onError: (_err, { nom }) => setError(ECHECS.modification(nom)),
  });

  const deleteMutation = useMutation({
    mutationFn: (foyer: HouseholdAdminDto) => api.delete(`/admin/households/${foyer.id}`),
    onSuccess: () => {
      setError(null);
      rafraichirFoyers();
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (_err, foyer) => setError(ECHECS.suppression(foyer.displayName)),
  });

  // Tout changement de critère ramène à la première page : la page 3 d'un
  // autre tri n'a aucun rapport avec celle qu'on regardait.
  function changerStatut(valeur: RsvpStatus | "ALL") {
    setStatut(valeur);
    setOffset(0);
  }
  function changerTri(valeur: HouseholdSortKey) {
    setTri(valeur);
    setOffset(0);
  }
  function inverserSens() {
    setSens((precedent) => (precedent === "asc" ? "desc" : "asc"));
    setOffset(0);
  }
  function changerTaille(valeur: number) {
    setLimit(valeur);
    setOffset(0);
    retenirTaille(valeur);
  }

  const filtreActif = Boolean(rechercheEnvoyee) || statut !== "ALL";
  const foyers = page?.items ?? [];

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
    {
      id: "nom",
      header: "Foyer",
      grow: true,
      cell: (h) => <span className="font-medium">{h.displayName}</span>,
    },
    // `confirmedCount` reste `null` tant que le foyer n'a pas répondu : « — »
    // porte cette distinction, jamais « 0 » qui dirait « personne ne vient ».
    { id: "places", header: "Places", cell: (h) => `${h.confirmedCount ?? "—"} / ${h.allocatedSeats}` },
    { id: "statut", header: "Statut", cell: (h) => <StatusBadge status={h.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: (h) => (
        <div className="flex flex-wrap gap-2 lg:flex-nowrap">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto]">
        <Field label="Rechercher un foyer">
          <Input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom du foyer ou d'un invité"
          />
        </Field>
        <Field label="Statut">
          <Select value={statut} onChange={(e) => changerStatut(e.target.value as RsvpStatus | "ALL")}>
            <option value="ALL">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="CONFIRMED">Confirmés</option>
            <option value="DECLINED">Déclinés</option>
          </Select>
        </Field>
        {/* Un seul contrôle de tri pour la table et pour les cartes du
            téléphone, qui n'ont pas d'en-têtes de colonnes où cliquer. */}
        <Field label="Trier par">
          <Select value={tri} onChange={(e) => changerTri(e.target.value as HouseholdSortKey)}>
            {TRIS.map(({ valeur, libelle }) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          {/* Le sens se lit en toutes lettres, pas à la seule flèche. Le nom
              accessible contient le libellé visible (WCAG 2.5.3). */}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:w-auto"
            aria-label={`Sens du tri : ${sens === "asc" ? "Croissant" : "Décroissant"}`}
            onClick={inverserSens}
          >
            {sens === "asc" ? (
              <ArrowUpNarrowWide aria-hidden="true" className="mr-2 h-4 w-4" />
            ) : (
              <ArrowDownWideNarrow aria-hidden="true" className="mr-2 h-4 w-4" />
            )}
            {sens === "asc" ? "Croissant" : "Décroissant"}
          </Button>
        </div>
      </div>

      {isError && (
        <p
          role="alert"
          className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          La liste des foyers n'a pas pu être chargée. Vérifiez votre connexion, puis rechargez la page.
        </p>
      )}

      {isPending ? (
        <div className="space-y-2">
          <p role="status" className="sr-only">
            Chargement des foyers…
          </p>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : !page ? null : page.total === 0 ? (
        // Le serveur ne dit plus combien de foyers existent hors filtre : c'est
        // le filtre actif qui distingue « la recherche ne donne rien » de
        // « aucun foyer saisi ».
        <EmptyState
          title={filtreActif ? "Aucun foyer ne correspond" : "Aucun foyer"}
          description={
            filtreActif
              ? "Essayez un autre nom, ou remettez le statut sur « Tous »."
              : "Ajoutez le premier foyer pour commencer à distribuer les invitations."
          }
          action={!filtreActif && <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>}
        />
      ) : (
        <div className="space-y-4" aria-busy={isPlaceholderData || undefined}>
          {isPlaceholderData && (
            <p role="status" className="sr-only">
              Chargement de la page…
            </p>
          )}
          <DataTable
            caption="Foyers invités"
            columns={colonnes}
            rows={foyers}
            rowKey={(h) => h.id}
            detail={(h) => <HouseholdDetail household={h} />}
            detailLabel={(h) => `Détail de ${h.displayName}`}
            expanded={ouverts}
            onToggleExpanded={basculer}
          />
          <Pagination
            label="Pages des foyers"
            total={page.total}
            offset={offset}
            limit={limit}
            onOffsetChange={setOffset}
            onLimitChange={changerTaille}
          />
        </div>
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
          onSubmit={(dto) => updateMutation.mutate({ id: editing.id, nom: editing.displayName, dto })}
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
            deleteMutation.mutate(aSupprimer);
            setASupprimer(null);
          }}
        />
      )}
    </div>
  );
}
