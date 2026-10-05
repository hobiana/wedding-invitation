import type { CSSProperties, ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { seatsFor, type TableHouseholdSummaryDto } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { places } from "@/lib/accord";
import { cn } from "@/lib/utils";

export interface HouseholdChipProps {
  household: TableHouseholdSummaryDto;
  /** Assis à une table : le menu dit « Déplacer vers… » et propose « Retirer ». */
  placed: boolean;
  /** Ouvre le choix de la table — « Placer à la table… » ou « Déplacer vers… ». */
  onPlace: () => void;
  onRemove?: () => void;
  /**
   * Bureau seulement. Le glisser est un raccourci de souris : au doigt il est
   * inutilisable, et ce n'est jamais le seul chemin — les boutons restent.
   */
  draggable?: boolean;
}

/**
 * Un foyer sur le plan de table.
 *
 * Les places affichées viennent de `seatsFor`, la définition que l'API emploie
 * pour refuser un placement : un foyer qui n'a pas répondu y compte pour toute
 * son allocation, jamais pour zéro.
 */
export function HouseholdChip(props: HouseholdChipProps) {
  return props.draggable ? <ChipGlissable {...props} /> : <Chip {...props} />;
}

function ChipGlissable(props: HouseholdChipProps) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.household.id });
  const style: CSSProperties | undefined = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  // La poignée est pour la souris seule : `aria-hidden` et hors tabulation. Le
  // clavier et le lecteur d'écran passent par le menu, qui fait la même chose
  // sans demander de viser une zone de dépôt. Les `attributes` de dnd-kit (un
  // `role="button"` focalisable) ne sont donc volontairement pas posés.
  const poignee = (
    <span
      data-testid="poignee-de-glisser"
      aria-hidden="true"
      className="-ml-1 cursor-grab touch-none rounded-control p-1 text-ink-muted hover:bg-cream hover:text-ink"
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </span>
  );

  return (
    <Chip
      {...props}
      nodeRef={setNodeRef}
      style={style}
      poignee={poignee}
      className={cn(isDragging && "relative z-10 shadow-card")}
    />
  );
}

function Chip({
  household,
  placed,
  onPlace,
  onRemove,
  nodeRef,
  style,
  poignee,
  className,
}: HouseholdChipProps & {
  nodeRef?: (element: HTMLElement | null) => void;
  style?: CSSProperties;
  poignee?: ReactNode;
  className?: string;
}) {
  return (
    <div
      ref={nodeRef}
      style={style}
      role="group"
      aria-label={household.displayName}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-surface border border-rule bg-ivory px-3 py-2 text-sm",
        className,
      )}
    >
      {poignee}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{household.displayName}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-ink-muted">
          <span className="tabular-nums">{places(seatsFor(household))}</span>
          <StatusBadge status={household.status} />
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {/* 40 px au téléphone, au plus près des 44 px recommandés pour le doigt. */}
        <Button type="button" variant="outline" size="sm" className="h-10 md:h-8" onClick={onPlace}>
          {placed ? "Déplacer vers…" : "Placer à la table…"}
        </Button>
        {placed && onRemove && (
          <Button type="button" variant="outline" size="sm" className="h-10 md:h-8" onClick={onRemove}>
            Retirer
          </Button>
        )}
      </div>
    </div>
  );
}
