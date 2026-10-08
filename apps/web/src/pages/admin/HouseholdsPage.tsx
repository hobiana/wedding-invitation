import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type {
  CreateHouseholdDto,
  HouseholdAdminDto,
  HouseholdSortKey,
  SortOrder,
  UpdateHouseholdDto,
} from "@invitation-app/shared";
import { api, listHouseholds } from "@/lib/api";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { membresRetenus, places, retenirMembres, sousTitreFoyers } from "@/lib/foyers";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZES } from "@/components/ui/page-sizes";
import { PageHeader } from "@/components/ui/page-header";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/StatusBadge";
import { HouseholdFormDialog } from "@/components/HouseholdFormDialog";
import { HouseholdDetail } from "@/components/HouseholdDetail";
import { HouseholdActionsCell, HouseholdNameCell } from "@/components/HouseholdRow";
import { HouseholdMobileCard } from "@/components/HouseholdMobileCard";
import { HouseholdToolbar, type StatutFiltre } from "@/components/HouseholdToolbar";

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

/**
 * Ce que la suppression détruit, dit en toutes lettres. Un foyer qui a répondu
 * emporte sa réponse, et sa réponse ne se redemande pas : c'est la phrase qui
 * distingue ce garde-fou d'un « Êtes-vous sûr ? ».
 */
function descriptionDeSuppression(foyer: HouseholdAdminDto): string {
  if (foyer.status === "CONFIRMED" && foyer.confirmedCount !== null) {
    // « a confirmé 1 personnes » serait une faute dans une interface qui est
    // en français sans exception.
    const personnes = foyer.confirmedCount > 1 ? "personnes" : "personne";
    return `Ce foyer a confirmé ${foyer.confirmedCount} ${personnes}. Supprimer efface sa réponse, et son lien cessera de fonctionner.`;
  }
  if (foyer.status === "DECLINED") {
    return `Ce foyer a décliné l'invitation. Supprimer efface sa réponse, et son lien cessera de fonctionner.`;
  }
  return "Ce foyer n'a pas encore répondu. Son lien d'invitation cessera de fonctionner.";
}

/**
 * Les foyers invités (maquettes 10 à 17). Bureau : une table, un panneau crème
 * sous chaque ligne dépliée, un pied de pagination. Téléphone (< 768 px) : un
 * en-tête collé, des cartes qui se déplient sur place, une pagination compacte.
 * **Un seul des deux rendus existe dans le DOM** (`useMediaQuery`), jamais deux
 * rendus dont l'un serait caché par CSS.
 *
 * La recherche, le filtre, le tri et la pagination partent au serveur.
 */
export function HouseholdsPage() {
  const queryClient = useQueryClient();
  const bureau = useMediaQuery("(min-width: 768px)");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdAdminDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState("");
  const [statut, setStatut] = useState<StatutFiltre>("ALL");
  const [tri, setTri] = useState<HouseholdSortKey>("name");
  const [sens, setSens] = useState<SortOrder>("asc");
  const [limit, setLimit] = useState(tailleRetenue);
  const [offset, setOffset] = useState(0);
  const [membres, setMembres] = useState(membresRetenus);
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

  /**
   * Le repère du focus quand l'élément qui le portait disparaît. Après une
   * suppression confirmée, l'`AlertDialog` rend le focus au « … » de la ligne
   * — qui disparaît à l'arrivée de la liste rechargée ; Chrome laisse alors le
   * focus sur `<body>`, et l'organisateur au clavier repartirait du haut de la
   * page. Même cas après une modification qui fait sortir le foyer de la page
   * (renommé, il change de place dans le tri).
   *
   * Le repère est la région « Liste des foyers » : elle existe dans tous les
   * états (lignes, liste vide, page reculée), et la tabulation suivante repart
   * dans les lignes, là où l'organisateur travaillait.
   *
   * La vérification se fait à la **première liste rechargée** après la
   * mutation, et une seule fois : c'est ce rendu-là qui retire la ligne. Si le
   * focus est encore sur un élément présent, on n'y touche pas.
   */
  const listeRef = useRef<HTMLElement>(null);
  const focusARattraper = useRef(false);
  useEffect(() => {
    if (!focusARattraper.current || isPlaceholderData) return;
    focusARattraper.current = false;
    const actif = document.activeElement;
    if (!actif || actif === document.body || !actif.isConnected) listeRef.current?.focus();
  }, [page, isPlaceholderData]);

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
      focusARattraper.current = true;
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
      focusARattraper.current = true;
      rafraichirFoyers();
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (_err, foyer) => setError(ECHECS.suppression(foyer.displayName)),
  });

  // Tout changement de critère ramène à la première page : la page 3 d'un
  // autre tri n'a aucun rapport avec celle qu'on regardait.
  function changerStatut(valeur: StatutFiltre) {
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
  function changerMembres(actif: boolean) {
    setMembres(actif);
    retenirMembres(actif);
  }

  const filtreActif = Boolean(rechercheEnvoyee) || statut !== "ALL";
  const foyers = page?.items ?? [];

  const colonnes: Column<HouseholdAdminDto>[] = [
    {
      id: "nom",
      header: "Foyer",
      grow: true,
      cell: (h) => <HouseholdNameCell household={h} showMembers={membres} />,
    },
    // `confirmedCount` reste `null` tant que le foyer n'a pas répondu : « — »
    // porte cette distinction, jamais « 0 » qui dirait « personne ne vient ».
    { id: "places", header: "Places", cell: (h) => <span className="tabular-nums">{places(h)}</span> },
    {
      id: "statut",
      header: "Statut",
      cell: (h) => <StatusBadge status={h.status} className="rounded-full px-2.5 py-1" />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (h) => <HouseholdActionsCell household={h} onEdit={setEditing} onDelete={setASupprimer} />,
    },
  ];

  // Sur téléphone, « + Ajouter » ; le nom accessible reste complet et contient
  // le libellé visible (WCAG 2.5.3).
  const ajouter = bureau ? (
    <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>
  ) : (
    <Button aria-label="Ajouter un foyer" onClick={() => setDialogOpen(true)}>
      <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
      Ajouter
    </Button>
  );

  return (
    <div className="space-y-4 px-4 pb-6 md:space-y-6 md:p-8">
      <PageHeader
        title="Foyers invités"
        subtitle={page ? sousTitreFoyers(page.total, filtreActif) : undefined}
        action={ajouter}
        sticky
        // Collé, l'en-tête doit toucher les deux bords : il compense le `px-4`
        // de la page, sinon les cartes défilent visibles sur les côtés.
        className="-mx-4 px-4 md:mx-0 md:px-0"
      />

      {error && (
        <p
          role="alert"
          className="rounded-card border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          {error}
        </p>
      )}

      <HouseholdToolbar
        variant={bureau ? "desktop" : "mobile"}
        recherche={recherche}
        onRechercheChange={setRecherche}
        statut={statut}
        onStatutChange={changerStatut}
        tri={tri}
        onTriChange={changerTri}
        sens={sens}
        onSensToggle={inverserSens}
        membres={membres}
        onMembresChange={changerMembres}
        limit={limit}
        onLimitChange={changerTaille}
      />

      {isError && (
        <p
          role="alert"
          className="rounded-card border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          La liste des foyers n'a pas pu être chargée. Vérifiez votre connexion, puis rechargez la page.
        </p>
      )}

      <section ref={listeRef} tabIndex={-1} aria-label="Liste des foyers" className="rounded-card">
        {isPending ? (
          <div className="space-y-2">
            <p role="status" className="sr-only">
              Chargement des foyers…
            </p>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className={bureau ? "h-12 w-full" : "h-36 w-full rounded-card"} />
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
              renderCard={(h, { ouvert, basculer: basculerCarte }) => (
                <HouseholdMobileCard
                  household={h}
                  showMembers={membres}
                  expanded={ouvert}
                  onToggle={basculerCarte}
                  onEdit={setEditing}
                  onDelete={setASupprimer}
                />
              )}
            />
            <Pagination
              label="Pages des foyers"
              variant={bureau ? "full" : "compact"}
              total={page.total}
              offset={offset}
              limit={limit}
              onOffsetChange={setOffset}
              onLimitChange={bureau ? changerTaille : undefined}
            />
          </div>
        )}
      </section>

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
