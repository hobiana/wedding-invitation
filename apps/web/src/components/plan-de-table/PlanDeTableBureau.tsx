import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { seatsTaken, type TableDto } from "@invitation-app/shared";
import { dragEndTarget, etatDeTable, issueDuGlisser, type FoyerEnJeu } from "@/lib/plan-de-table";
import { HouseholdCard, type DonneesDeGlisser, type FoyerAPlacer } from "./HouseholdCard";
import { PlacementBanner } from "./PlacementBanner";
import { TableCard } from "./TableCard";
import { TableForm } from "./TableForm";
import { ToPlaceList } from "./ToPlaceList";

export interface PlanDeTableBureauProps {
  tables: TableDto[];
  /** Foyers à placer — non assis, non déclinés (`foyersAPlacer`), dans l'ordre du serveur. */
  aPlacer: FoyerAPlacer[];
  onAssign: (tableId: string, householdId: string) => void;
  onUnassign: (householdId: string) => void;
  /** Résout `true` si la table est créée : le brouillon se ferme. `false` : il reste, la page a dit pourquoi. */
  onCreateTable: (dto: { name: string; capacity: number }) => Promise<boolean>;
  /** Même contrat que `onCreateTable`. */
  onUpdateTable: (id: string, dto: { name: string; capacity: number }) => Promise<boolean>;
  /** « Supprimer » du formulaire : la page demande confirmation. */
  onDeleteTable: (table: TableDto) => void;
}

const CAPACITE_PAR_DEFAUT = 10;

/**
 * dnd-kit annonce le glisser en anglais par défaut, dans une région live
 * invisible. L'admin est en français sans exception, lecteur d'écran compris.
 * Le glisser est un raccourci de souris : le clavier passe par « Placer » et ×.
 */
const INSTRUCTIONS = {
  draggable: "Utilisez plutôt le bouton « Placer » de ce foyer, ou le bouton × de sa table pour l'en retirer.",
};
const ANNONCES: Announcements = {
  onDragStart: () => "Foyer saisi.",
  onDragOver: ({ over }) => (over ? "Au-dessus d'une zone de dépôt." : undefined),
  onDragEnd: ({ over }) => (over ? "Foyer déposé." : "Foyer relâché hors d'une zone de dépôt."),
  onDragCancel: () => "Déplacement annulé.",
};

function parFoyer(id: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>("[data-household-id]")].find((e) => e.dataset.householdId === id);
}
function parTable(id: string, selecteur: string): HTMLElement | null {
  const section = [...document.querySelectorAll<HTMLElement>("[data-table-id]")].find((e) => e.dataset.tableId === id);
  return section?.querySelector<HTMLElement>(selecteur) ?? null;
}

/**
 * Le plan de table au bureau (≥ 768 px) : « À placer » à gauche, la grille des
 * tables à droite, et trois façons d'agir — « Placer » puis « Placer ici »,
 * le glisser à la souris, et × pour retirer. Pas de « Déplacer » : on glisse,
 * ou on retire puis on place (décision du commanditaire).
 *
 * L'état d'interface vit ici (mode « Où placer ? », glisser en cours,
 * brouillons de formulaire) ; les données et les requêtes restent à la page.
 */
export function PlanDeTableBureau({
  tables,
  aPlacer,
  onAssign,
  onUnassign,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
}: PlanDeTableBureauProps) {
  const [placement, setPlacement] = useState<FoyerAPlacer | null>(null);
  const [glisse, setGlisse] = useState<DonneesDeGlisser | null>(null);
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const nouvelleTableRef = useRef<HTMLButtonElement>(null);
  const brouillonRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /** Une cible de focus à poser une fois le prochain rendu fait (le bouton n'existe pas encore). */
  const aFocaliser = useRef<(() => HTMLElement | null | undefined) | null>(null);

  /**
   * Le foyer qu'on vient de placer ou de retirer, et d'où il partait.
   *
   * Le foyer change de colonne : son bouton est démonté et le focus retombait
   * sur `<body>` (relevé dans Chrome, `8edfd79`). Quand le plan rechargé le
   * montre ailleurs, on le suit jusqu'à sa nouvelle place. Un refus du serveur
   * ne le déplace pas : rien n'est alors volé. Périmé au bout de 5 s, pour
   * qu'un rechargement sans rapport ne tire pas le focus plus tard.
   */
  const suivi = useRef<{ id: string; depuis: string | null; le: number } | null>(null);
  function suivre(id: string, depuis: string | null) {
    suivi.current = { id, depuis, le: Date.now() };
  }

  useEffect(() => {
    const s = suivi.current;
    if (s) {
      if (Date.now() - s.le > 5000) {
        suivi.current = null;
      } else {
        const assisA = tables.find((t) => t.households.some((h) => h.id === s.id))?.id ?? null;
        if (assisA !== s.depuis) {
          suivi.current = null;
          // Sa ligne à la table, ou sa carte dans « À placer » ; à défaut —
          // décliné, donc masqué, ou caché par la recherche — la table qu'il
          // vient de quitter, puis le titre « À placer ».
          const cible =
            parFoyer(s.id)?.querySelector<HTMLElement>("button") ??
            (s.depuis ? parTable(s.depuis, "[data-repere-table]") : null) ??
            document.querySelector<HTMLElement>("[data-repere-a-placer]");
          cible?.focus();
        }
      }
    }
    if (aFocaliser.current) {
      const cible = aFocaliser.current();
      aFocaliser.current = null;
      cible?.focus();
    }
  });

  // La table qu'on modifiait a disparu — supprimée, ici ou ailleurs : son
  // formulaire part avec elle, et le focus ne doit pas tomber sur `<body>`.
  const tableEnEdition = edition ? tables.find((t) => t.id === edition) : undefined;
  useEffect(() => {
    if (edition && !tableEnEdition) {
      setEdition(null);
      nouvelleTableRef.current?.focus();
    }
  }, [edition, tableEnEdition]);

  // Échap annule le mode « Où placer ? », d'où que soit le focus.
  useEffect(() => {
    if (!placement) return;
    const id = placement.id;
    function echap(evenement: KeyboardEvent) {
      if (evenement.key !== "Escape") return;
      setPlacement(null);
      parFoyer(id)?.querySelector<HTMLElement>("button")?.focus();
    }
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [placement]);

  const enJeu: FoyerEnJeu | null = placement ? { foyer: placement, depuis: null } : glisse;

  function choisir(foyer: FoyerAPlacer) {
    if (placement?.id === foyer.id) {
      // « Choisir une table → » : on emmène le clavier à la première table possible.
      document.querySelector<HTMLElement>("[data-etat='accueille'] [data-action='placer-ici']")?.focus();
      return;
    }
    setPlacement(foyer);
  }

  function annulerPlacement() {
    if (!placement) return;
    const id = placement.id;
    setPlacement(null);
    parFoyer(id)?.querySelector<HTMLElement>("button")?.focus();
  }

  function placerIci(table: TableDto) {
    if (!placement) return;
    const id = placement.id;
    setPlacement(null);
    suivre(id, null);
    onAssign(table.id, id);
    // « Placer ici » va être démonté : le focus attend sur le foyer, qui est
    // encore dans « À placer » jusqu'à la réponse du serveur.
    parFoyer(id)?.querySelector<HTMLElement>("button")?.focus();
  }

  function retirer(householdId: string, depuis: string) {
    suivre(householdId, depuis);
    onUnassign(householdId);
  }

  function debutDuGlisser(evenement: DragStartEvent) {
    setPlacement(null);
    setGlisse((evenement.active.data.current as DonneesDeGlisser | undefined) ?? null);
  }

  function finDuGlisser(evenement: DragEndEvent) {
    const depuis = glisse?.depuis ?? null;
    setGlisse(null);
    // Pas de suivi du focus ici : le geste est à la souris, et tirer le focus
    // ferait défiler la page sous la main de l'organisateur.
    const issue = issueDuGlisser(dragEndTarget(evenement), depuis);
    if (!issue) return;
    if (issue.geste === "retirer") onUnassign(issue.householdId);
    else onAssign(issue.tableId, issue.householdId);
  }

  function ouvrirCreation() {
    if (creation) {
      brouillonRef.current?.querySelector<HTMLElement>("input")?.focus();
      return;
    }
    setCreation(true);
  }

  function fermerCreation() {
    setCreation(false);
    nouvelleTableRef.current?.focus();
  }

  async function creer(dto: { name: string; capacity: number }) {
    setEnCours(true);
    const reussi = await onCreateTable(dto);
    setEnCours(false);
    if (reussi) fermerCreation();
  }

  function fermerEdition(id: string) {
    setEdition(null);
    aFocaliser.current = () => parTable(id, "[data-action='modifier']");
  }

  async function modifier(id: string, dto: { name: string; capacity: number }) {
    setEnCours(true);
    const reussi = await onUpdateTable(id, dto);
    setEnCours(false);
    if (reussi) fermerEdition(id);
  }

  const aucuneTable = placement !== null && !tables.some((t) => etatDeTable(t, enJeu) === "accueille");

  return (
    <DndContext
      sensors={sensors}
      onDragStart={debutDuGlisser}
      onDragEnd={finDuGlisser}
      onDragCancel={() => setGlisse(null)}
      accessibility={{ announcements: ANNONCES, screenReaderInstructions: INSTRUCTIONS }}
    >
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <ToPlaceList
          foyers={aPlacer}
          placesAPlacer={seatsTaken(aPlacer)}
          selectionId={placement?.id ?? null}
          onPlacer={choisir}
          glissable
        />

        <div className="min-w-0 space-y-4">
          <PlacementBanner foyer={placement} aucuneTable={aucuneTable} onAnnuler={annulerPlacement} />

          {tables.length === 0 && !creation && (
            <p className="text-sm text-ink-muted">
              Aucune table pour l'instant : créez la première avec « Nouvelle table », les foyers pourront ensuite y être
              placés.
            </p>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
            {tables.map((table) =>
              table.id === edition ? (
                <TableForm
                  key={table.id}
                  mode="modification"
                  nomInitial={table.name}
                  capaciteInitiale={table.capacity}
                  occupees={seatsTaken(table.households)}
                  enCours={enCours}
                  onTerminer={(dto) => void modifier(table.id, dto)}
                  onFermer={() => fermerEdition(table.id)}
                  onSupprimer={() => onDeleteTable(table)}
                />
              ) : (
                <TableCard
                  key={table.id}
                  table={table}
                  etat={etatDeTable(table, enJeu)}
                  onRetirer={(foyer) => retirer(foyer.id, table.id)}
                  onModifier={placement ? undefined : () => setEdition(table.id)}
                  onPlacerIci={
                    placement && etatDeTable(table, enJeu) === "accueille" ? () => placerIci(table) : undefined
                  }
                  glissable
                />
              ),
            )}

            {creation && (
              <div ref={brouillonRef}>
                <TableForm
                  mode="creation"
                  nomInitial={`Table ${tables.length + 1}`}
                  capaciteInitiale={CAPACITE_PAR_DEFAUT}
                  enCours={enCours}
                  onTerminer={(dto) => void creer(dto)}
                  onFermer={fermerCreation}
                />
              </div>
            )}

            <button
              ref={nouvelleTableRef}
              type="button"
              onClick={ouvrirCreation}
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-surface border border-dashed border-gold text-sm text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nouvelle table
            </button>
          </div>
        </div>
      </div>

      {/* Pas d'animation de retour : l'admin n'anime rien. */}
      <DragOverlay dropAnimation={null}>
        {glisse ? <HouseholdCard foyer={glisse.foyer} onPlacer={() => {}} fantome /> : null}
      </DragOverlay>
    </DndContext>
  );
}
