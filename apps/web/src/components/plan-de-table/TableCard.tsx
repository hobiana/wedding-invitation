import { useDraggable, useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";
import { seatsFor, seatsTaken, type TableDto, type TableHouseholdSummaryDto } from "@invitation-app/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { places, placesLibres } from "@/lib/accord";
import { cn } from "@/lib/utils";
import type { EtatDeTable } from "@/lib/plan-de-table";
import type { DonneesDeGlisser } from "./HouseholdCard";

export type { EtatDeTable };

export interface TableCardProps {
  table: TableDto;
  etat?: EtatDeTable;
  /** Le × d'une ligne. */
  onRetirer: (foyer: TableHouseholdSummaryDto) => void;
  /** « Modifier la table », affiché seulement s'il est fourni. */
  onModifier?: () => void;
  /** « Placer ici », affiché à la place de « Modifier la table » s'il est fourni. */
  onPlacerIci?: () => void;
  /** Bureau : les lignes se glissent, la carte reçoit un dépôt. Exige un `DndContext` parent. */
  glissable?: boolean;
}

export function TableCard(props: TableCardProps) {
  return props.glissable ? <CarteDeposable {...props} /> : <Carte {...props} />;
}

function CarteDeposable(props: TableCardProps) {
  // Une table où le foyer ne tient pas ne reçoit pas le dépôt : lâché dessus, il
  // revient d'où il vient, sans requête que le serveur refuserait.
  const { setNodeRef, isOver } = useDroppable({ id: props.table.id, disabled: props.etat === "trop-petite" });
  return <Carte {...props} nodeRef={setNodeRef} survolee={isOver} />;
}

function Carte({
  table,
  etat = "repos",
  onRetirer,
  onModifier,
  onPlacerIci,
  glissable = false,
  nodeRef,
  survolee = false,
}: TableCardProps & { nodeRef?: (element: HTMLElement | null) => void; survolee?: boolean }) {
  const prises = seatsTaken(table.households);
  const libres = table.capacity - prises;
  const titreId = `table-${table.id}-titre`;
  const remplissage = table.capacity > 0 ? Math.min(100, (prises / table.capacity) * 100) : 100;

  return (
    <section
      ref={nodeRef}
      aria-labelledby={titreId}
      data-table-id={table.id}
      data-etat={etat}
      className={cn(
        "flex flex-col rounded-surface border bg-ivory px-5 pb-4 pt-5 transition-colors duration-(--duration-micro) ease-(--ease-in)",
        etat === "accueille" ? "border-bordeaux-500 shadow-card" : "border-rule",
        survolee && "bg-bordeaux-50",
      )}
    >
      {/* Estompé : le contenu pâlit, jamais la phrase qui dit pourquoi — elle
          tomberait vers 2,8:1, sous le seuil du texte. */}
      <div data-estompe={etat === "trop-petite" ? "" : undefined} className={cn(etat === "trop-petite" && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-3">
        {/* `tabIndex={-1}` : le repère où le focus se pose quand le foyer qu'on
            vient de retirer n'a plus de carte où aller (un foyer décliné).
            `PlanDeTableBureau` le cherche par `data-repere-table`. */}
        <h3 id={titreId} tabIndex={-1} data-repere-table={table.id} className="font-display text-2xl leading-tight text-ink">
          {table.name}
        </h3>
        <span className="shrink-0 text-sm tabular-nums text-ink-muted">
          {prises} / {table.capacity}
        </span>
      </div>

      {/* La barre double le texte qui suit, elle ne le remplace pas. */}
      <div aria-hidden="true" className="mt-3 h-0.5 w-full bg-rule">
        <div className={cn("h-full", libres < 0 ? "bg-danger" : "bg-bordeaux-700")} style={{ width: `${remplissage}%` }} />
      </div>
      <p className={cn("mt-3 text-xs", libres < 0 ? "font-medium text-danger" : "text-ink-muted")}>
        {libres < 0 ? `Dépassement de ${places(-libres)}` : libres === 0 ? "Complète" : placesLibres(libres)}
      </p>

      <div className="mt-3 border-t border-rule">
        {table.households.length === 0 ? (
          <p className="py-3 text-sm italic text-ink-muted">Table libre</p>
        ) : (
          <ul className="divide-y divide-rule">
            {table.households.map((foyer) => (
              <LigneDeFoyer key={foyer.id} foyer={foyer} table={table} onRetirer={onRetirer} glissable={glissable} />
            ))}
          </ul>
        )}
      </div>
      </div>

      {etat === "trop-petite" && <p className="py-3 text-center text-xs text-ink-muted">Pas assez de places</p>}

      <div className="mt-auto pt-3">
        {onPlacerIci ? (
          <Button
            type="button"
            onClick={onPlacerIci}
            data-action="placer-ici"
            aria-label={`Placer ici, à la table « ${table.name} »`}
            className="w-full"
          >
            Placer ici
          </Button>
        ) : onModifier ? (
          <button
            type="button"
            onClick={onModifier}
            data-action="modifier"
            aria-label={`Modifier la table « ${table.name} »`}
            className="-ml-1 inline-flex min-h-8 items-center rounded-control px-1 text-xs text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:text-ink hover:underline"
          >
            Modifier la table
          </button>
        ) : null}
      </div>
    </section>
  );
}

interface LigneProps {
  foyer: TableHouseholdSummaryDto;
  table: TableDto;
  onRetirer: (foyer: TableHouseholdSummaryDto) => void;
  glissable: boolean;
}

function LigneDeFoyer(props: LigneProps) {
  return props.glissable ? <LigneGlissable {...props} /> : <Ligne {...props} />;
}

function LigneGlissable(props: LigneProps) {
  const donnees: DonneesDeGlisser = { foyer: props.foyer, depuis: props.table.id };
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: props.foyer.id, data: donnees });
  return <Ligne {...props} nodeRef={setNodeRef} listeners={listeners} enCoursDeGlisser={isDragging} />;
}

function Ligne({
  foyer,
  table,
  onRetirer,
  glissable,
  nodeRef,
  listeners,
  enCoursDeGlisser = false,
}: LigneProps & {
  nodeRef?: (element: HTMLElement | null) => void;
  listeners?: ReturnType<typeof useDraggable>["listeners"];
  enCoursDeGlisser?: boolean;
}) {
  const nombre = seatsFor(foyer);
  return (
    <li
      ref={nodeRef}
      {...listeners}
      data-household-id={foyer.id}
      data-glissable={glissable ? "true" : undefined}
      className={cn("flex items-center gap-2 py-2 text-sm", glissable && "cursor-grab", enCoursDeGlisser && "opacity-40")}
    >
      {/* Le badge sous le nom, et non à côté : à côté, un nom long (« Famille
          Rakotomalala ») ne gardait qu'une centaine de pixels dans une carte de
          240 px et se coupait au milieu du mot. */}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="break-words text-ink">{foyer.displayName}</span>
        {foyer.status === "PENDING" && <Badge tone="pending">en attente</Badge>}
        {foyer.status === "DECLINED" && <Badge tone="no">a décliné</Badge>}
      </span>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-muted">
        <span aria-hidden="true">{nombre}</span>
        <span className="sr-only">{places(nombre)}</span>
      </span>
      <button
        type="button"
        onClick={() => onRetirer(foyer)}
        aria-label={`Retirer ${foyer.displayName} de la table « ${table.name} »`}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream hover:text-ink"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
