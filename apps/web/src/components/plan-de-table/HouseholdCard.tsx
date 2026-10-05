import { useDraggable } from "@dnd-kit/core";
import { seatsFor, type HouseholdAdminDto } from "@invitation-app/shared";
import { places } from "@/lib/accord";
import { cn } from "@/lib/utils";

/**
 * Ce qu'il faut d'un foyer pour le placer. `memberNames` est facultatif : la
 * recherche s'en sert quand il est là (il vient de `GET /admin/households`),
 * mais un résumé de table (`TableHouseholdSummaryDto`) n'en porte pas.
 */
export type FoyerAPlacer = Pick<HouseholdAdminDto, "id" | "displayName" | "allocatedSeats" | "confirmedCount" | "status"> & {
  memberNames?: string[];
};

/** Ce que porte un glisser, lu au dépôt : le foyer, et la table qu'il quitte. */
export interface DonneesDeGlisser {
  foyer: FoyerAPlacer;
  depuis: string | null;
}

export interface HouseholdCardProps {
  foyer: FoyerAPlacer;
  /** Le bouton de la carte : « Placer », ou « Choisir une table → » une fois sélectionnée. */
  onPlacer: () => void;
  /** Le foyer dont on choisit la table : la carte passe en bordeaux. */
  selectionne?: boolean;
  /**
   * Bureau seulement : la carte entière se saisit à la souris. Exige un
   * `DndContext` parent. Le glisser n'est jamais le seul chemin — le bouton reste.
   */
  glissable?: boolean;
  /** Le fantôme sous la souris pendant un glisser : une image, sans bouton ni repère de focus. */
  fantome?: boolean;
}

/** « 1 place · en attente de réponse », ou « 5 places ». */
function sousTitre(foyer: FoyerAPlacer): string {
  const nombre = places(seatsFor(foyer));
  return foyer.status === "PENDING" ? `${nombre} · en attente de réponse` : nombre;
}

/**
 * Un foyer de la colonne « À placer ».
 *
 * Les places viennent de `seatsFor`, la définition de l'API : un foyer qui n'a
 * pas répondu compte pour toute son allocation, jamais pour zéro.
 */
export function HouseholdCard(props: HouseholdCardProps) {
  if (props.fantome) return <Apparence {...props} />;
  return props.glissable ? <CarteGlissable {...props} /> : <Apparence {...props} />;
}

function CarteGlissable(props: HouseholdCardProps) {
  const donnees: DonneesDeGlisser = { foyer: props.foyer, depuis: null };
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: props.foyer.id, data: donnees });
  // Pas d'`attributes` de dnd-kit (un `role="button"` focalisable de plus) :
  // le clavier passe par le bouton « Placer », qui fait la même chose sans
  // demander de viser une table. Et pas de `transform` : c'est le fantôme du
  // `DragOverlay` qui suit la souris, l'original reste en place, estompé.
  return <Apparence {...props} nodeRef={setNodeRef} listeners={listeners} enCoursDeGlisser={isDragging} />;
}

function Apparence({
  foyer,
  onPlacer,
  selectionne = false,
  glissable = false,
  fantome = false,
  nodeRef,
  listeners,
  enCoursDeGlisser = false,
}: HouseholdCardProps & {
  nodeRef?: (element: HTMLElement | null) => void;
  listeners?: ReturnType<typeof useDraggable>["listeners"];
  enCoursDeGlisser?: boolean;
}) {
  return (
    <div
      ref={nodeRef}
      {...listeners}
      {...(fantome
        ? { "aria-hidden": true }
        : { role: "group", "aria-label": foyer.displayName, "data-household-id": foyer.id })}
      data-glissable={glissable && !fantome ? "true" : undefined}
      data-selectionne={selectionne ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-surface border px-3.5 py-3 transition-colors duration-(--duration-micro) ease-(--ease-in)",
        selectionne ? "border-bordeaux-700 bg-bordeaux-700" : "border-rule bg-ivory",
        glissable && "cursor-grab",
        fantome && "cursor-grabbing border-bordeaux-500 shadow-card",
        enCoursDeGlisser && "opacity-40",
      )}
    >
      <div className="min-w-0 flex-1">
        {/* Pas de `truncate` : « Fa… » ne se lit pas. Le nom passe à la ligne. */}
        <p className={cn("break-words text-sm font-medium", selectionne ? "text-on-bordeaux" : "text-ink")}>
          {foyer.displayName}
        </p>
        <p className={cn("mt-0.5 text-xs", selectionne ? "text-on-bordeaux-muted" : "text-ink-muted")}>
          {sousTitre(foyer)}
        </p>
      </div>
      {fantome ? (
        <span className="px-2 text-xs text-ink-muted">Placer</span>
      ) : (
        <button
          type="button"
          onClick={onPlacer}
          aria-label={selectionne ? `Choisir une table pour ${foyer.displayName}` : `Placer ${foyer.displayName}`}
          className={cn(
            "inline-flex h-8 shrink-0 items-center rounded-control px-2 text-xs transition-colors duration-(--duration-micro) ease-(--ease-in)",
            selectionne
              ? "font-medium text-on-bordeaux hover:bg-bordeaux-900"
              : "text-ink-muted hover:bg-cream hover:text-ink",
          )}
        >
          {selectionne ? "Choisir une table →" : "Placer"}
        </button>
      )}
    </div>
  );
}
