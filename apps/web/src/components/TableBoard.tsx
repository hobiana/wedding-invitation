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

export function TableBoard({ tables, unassignedHouseholds, onAssign, onUnassign }: TableBoardProps) {
  function handleDragEnd(event: DragEndEvent) {
    const householdId = String(event.active.id);
    const targetId = event.over?.id ? String(event.over.id) : null;
    if (!targetId || targetId === "unassigned") {
      onUnassign(householdId);
    } else {
      onAssign(targetId, householdId);
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
