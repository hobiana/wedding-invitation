import { useState, type ReactNode } from "react";
import { DndContext, useDroppable, type Announcements, type DragEndEvent } from "@dnd-kit/core";
import { ChevronDown } from "lucide-react";
import {
  seatsFor,
  seatsTaken,
  type TableDto,
  type TableHouseholdSummaryDto,
} from "@invitation-app/shared";
import { Dialog } from "@/components/ui/dialog";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { places, placesRestantes } from "@/lib/accord";
import { cn } from "@/lib/utils";
import { HouseholdChip } from "./HouseholdChip";

interface TableBoardProps {
  tables: TableDto[];
  unassignedHouseholds: TableHouseholdSummaryDto[];
  onAssign: (tableId: string, householdId: string) => void;
  onUnassign: (householdId: string) => void;
}

/** Le foyer dont on choisit la table, et celle où il est déjà assis s'il l'est. */
interface Placement {
  household: TableHouseholdSummaryDto;
  depuis: string | null;
}

/**
 * What a drag-end event means, or `null` when it means nothing.
 *
 * dnd-kit leaves `event.over` null both for a drag dropped on dead space and
 * for one the user cancelled with Escape. Those used to be indistinguishable
 * from a drop on the "unassigned" zone, so cancelling a drag silently pulled
 * the household off its table. Only an explicit drop on a droppable counts.
 *
 * Exported so the three outcomes can be tested directly — dnd-kit's pointer
 * sensors don't produce real drags under jsdom.
 */
export function dragEndTarget(
  event: DragEndEvent,
): { householdId: string; tableId: string | null } | null {
  if (!event.over) return null;
  const targetId = String(event.over.id);
  return {
    householdId: String(event.active.id),
    tableId: targetId === "unassigned" ? null : targetId,
  };
}

/**
 * dnd-kit annonce le glisser en anglais par défaut, dans une région live
 * invisible. L'admin est en français sans exception, lecteur d'écran compris.
 */
const INSTRUCTIONS = {
  draggable:
    "Utilisez plutôt le bouton « Placer à la table… » ou « Déplacer vers… » de ce foyer.",
};
const ANNONCES: Announcements = {
  onDragStart: () => "Foyer saisi.",
  onDragOver: ({ over }) => (over ? "Au-dessus d'une zone de dépôt." : undefined),
  onDragEnd: ({ over }) => (over ? "Foyer déposé." : "Foyer relâché hors d'une zone de dépôt."),
  onDragCancel: () => "Déplacement annulé.",
};

function DroppableZone({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-24 rounded-surface border-2 border-dashed p-3 transition-colors duration-(--duration-micro) ease-(--ease-in)",
        isOver ? "border-bordeaux-500 bg-bordeaux-50" : "border-rule",
      )}
    >
      {children}
    </div>
  );
}

/** « 4 / 10 places · 6 places restantes », ou le dépassement dit en mots. */
function Occupation({ table }: { table: TableDto }) {
  const prises = seatsTaken(table.households);
  const restantes = table.capacity - prises;
  return (
    <span className="text-sm font-normal text-ink-muted">
      <span className="tabular-nums">
        {prises} / {table.capacity} {table.capacity >= 2 ? "places" : "place"}
      </span>
      {" · "}
      {restantes < 0 ? (
        // Le mot porte l'alerte ; la teinte bordeaux ne fait que la souligner.
        <span className="font-medium text-bordeaux-700">
          Dépassement de {places(-restantes)}
        </span>
      ) : (
        <span>{restantes === 0 ? "Complète" : placesRestantes(restantes)}</span>
      )}
    </span>
  );
}

function ListeDeFoyers({
  households,
  vide,
  rendu,
}: {
  households: TableHouseholdSummaryDto[];
  vide: string;
  rendu: (h: TableHouseholdSummaryDto) => ReactNode;
}) {
  if (households.length === 0) return <p className="text-sm text-ink-muted">{vide}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {households.map((h) => (
        <li key={h.id}>{rendu(h)}</li>
      ))}
    </ul>
  );
}

export function TableBoard({ tables, unassignedHouseholds, onAssign, onUnassign }: TableBoardProps) {
  const bureau = useMediaQuery("(min-width: 768px)");
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [deplies, setDeplies] = useState<ReadonlySet<string>>(() => new Set());

  function handleDragEnd(event: DragEndEvent) {
    const target = dragEndTarget(event);
    if (!target) return;
    if (target.tableId === null) {
      onUnassign(target.householdId);
    } else {
      onAssign(target.tableId, target.householdId);
    }
  }

  function basculer(id: string) {
    setDeplies((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function chip(h: TableHouseholdSummaryDto, depuis: string | null) {
    return (
      <HouseholdChip
        household={h}
        placed={depuis !== null}
        draggable={bureau}
        onPlace={() => setPlacement({ household: h, depuis })}
        onRemove={depuis !== null ? () => onUnassign(h.id) : undefined}
      />
    );
  }

  const nonPlaces = (
    <ListeDeFoyers
      households={unassignedHouseholds}
      vide="Tous les foyers sont placés."
      rendu={(h) => chip(h, null)}
    />
  );

  const dialogue = placement && (
    <DialogueDePlacement
      placement={placement}
      tables={tables}
      onChoisir={(tableId) => {
        onAssign(tableId, placement.household.id);
        setPlacement(null);
      }}
      onFermer={() => setPlacement(null)}
    />
  );

  if (!bureau) {
    // Téléphone : une liste, les non-placés en tête et dépliés — c'est là
    // qu'est le travail —, puis chaque table repliée derrière son occupation.
    return (
      <div className="space-y-6">
        <section aria-labelledby="titre-non-places" className="space-y-3">
          <h2 id="titre-non-places" className="font-display text-xl text-ink">
            Non placés
          </h2>
          {nonPlaces}
        </section>
        <ul className="divide-y divide-rule rounded-surface border border-rule bg-ivory">
          {tables.map((table) => {
            const ouvert = deplies.has(table.id);
            const contenuId = `table-${table.id}-foyers`;
            return (
              <li key={table.id}>
                <h2>
                  <button
                    type="button"
                    aria-expanded={ouvert}
                    aria-controls={contenuId}
                    onClick={() => basculer(table.id)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-ink">{table.name}</span>
                      <Occupation table={table} />
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn("h-4 w-4 shrink-0 text-ink-muted", ouvert && "rotate-180")}
                    />
                  </button>
                </h2>
                {ouvert && (
                  <div id={contenuId} className="px-4 pb-4">
                    <ListeDeFoyers
                      households={table.households}
                      vide="Aucun foyer à cette table."
                      rendu={(h) => chip(h, table.id)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {dialogue}
      </div>
    );
  }

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      accessibility={{ announcements: ANNONCES, screenReaderInstructions: INSTRUCTIONS }}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section aria-labelledby="titre-non-places">
          <h2 id="titre-non-places" className="mb-2 font-medium text-ink">
            Non placés
          </h2>
          <DroppableZone id="unassigned">{nonPlaces}</DroppableZone>
        </section>
        {tables.map((table) => (
          <section key={table.id} aria-labelledby={`titre-${table.id}`}>
            <h2 id={`titre-${table.id}`} className="mb-2 flex flex-wrap items-baseline gap-x-2 font-medium text-ink">
              {table.name}
              <Occupation table={table} />
            </h2>
            <DroppableZone id={table.id}>
              <ListeDeFoyers
                households={table.households}
                vide="Aucun foyer à cette table."
                rendu={(h) => chip(h, table.id)}
              />
            </DroppableZone>
          </section>
        ))}
      </div>
      {dialogue}
    </DndContext>
  );
}

/**
 * Le chemin sans glisser. Chaque table dit ce qui lui reste, et celles où le
 * foyer ne tient pas sont désactivées **et dites** — « Complète », « Trop
 * petite » —, jamais grisées seulement.
 *
 * Le calcul vient de `seatsFor`/`seatsTaken`, la définition de l'API. Il
 * n'autorise rien pour autant : entre le chargement et le clic, un autre onglet
 * a pu remplir la table. C'est le serveur qui tranche, et la page affiche son
 * refus.
 */
function DialogueDePlacement({
  placement,
  tables,
  onChoisir,
  onFermer,
}: {
  placement: Placement;
  tables: TableDto[];
  onChoisir: (tableId: string) => void;
  onFermer: () => void;
}) {
  const { household, depuis } = placement;
  const besoin = seatsFor(household);
  const candidates = tables.filter((t) => t.id !== depuis);

  return (
    <Dialog
      open
      onOpenChange={(ouvert) => !ouvert && onFermer()}
      title={`${depuis ? "Déplacer" : "Placer"} ${household.displayName}`}
      description={`${places(besoin)} à placer.`}
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucune autre table pour l'instant.</p>
      ) : (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {candidates.map((table) => {
            const restantes = table.capacity - seatsTaken(table.households);
            const pleine = restantes <= 0;
            const tient = !pleine && besoin <= restantes;
            return (
              <li key={table.id}>
                <button
                  type="button"
                  disabled={!tient}
                  onClick={() => onChoisir(table.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-control border border-rule bg-ivory px-4 py-2 text-left text-sm transition-colors duration-(--duration-micro) ease-(--ease-in) hover:border-bordeaux-500 hover:bg-cream disabled:cursor-not-allowed disabled:bg-cream disabled:text-ink-muted disabled:hover:border-rule"
                >
                  <span className="font-medium">{table.name}</span>
                  <span className="text-right">
                    {pleine ? (
                      "Complète"
                    ) : (
                      <>
                        {placesRestantes(restantes)}
                        {!tient && (
                          <span className="block text-xs">Trop petite pour ce foyer</span>
                        )}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
