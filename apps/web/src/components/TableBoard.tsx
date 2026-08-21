import type { ReactNode } from "react";
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { HouseholdChip } from "./HouseholdChip";

interface TableBoardProps {
  tables: TableDto[];
  unassignedHouseholds: TableHouseholdSummaryDto[];
  onAssign: (tableId: string, householdId: string) => void;
  onUnassign: (householdId: string) => void;
}

function DroppableZone({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-24 border-2 border-dashed rounded-lg p-3 ${isOver ? "border-neutral-900" : "border-neutral-300"}`}
    >
      {children}
    </div>
  );
}

function seatsUsed(households: TableHouseholdSummaryDto[]) {
  return households.reduce((sum, h) => sum + (h.confirmedCount ?? h.allocatedSeats), 0);
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

export function TableBoard({ tables, unassignedHouseholds, onAssign, onUnassign }: TableBoardProps) {
  function handleDragEnd(event: DragEndEvent) {
    const target = dragEndTarget(event);
    if (!target) return;
    if (target.tableId === null) {
      onUnassign(target.householdId);
    } else {
      onAssign(target.tableId, target.householdId);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <h2 className="font-medium mb-2">Non assignés</h2>
          <DroppableZone id="unassigned">
            <div className="flex flex-col gap-2">
              {unassignedHouseholds.map((h) => (
                <HouseholdChip key={h.id} household={h} />
              ))}
            </div>
          </DroppableZone>
        </div>
        {tables.map((table) => {
          const used = seatsUsed(table.households);
          const over = used > table.capacity;
          return (
            <div key={table.id}>
              <h2 className={`font-medium mb-2 ${over ? "text-red-600" : ""}`}>
                {table.name} — {used} / {table.capacity}
                {over && " ⚠ dépassement"}
              </h2>
              <DroppableZone id={table.id}>
                <div className="flex flex-col gap-2">
                  {table.households.map((h) => (
                    <HouseholdChip key={h.id} household={h} />
                  ))}
                </div>
              </DroppableZone>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
