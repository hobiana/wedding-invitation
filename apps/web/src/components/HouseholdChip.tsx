import { useDraggable } from "@dnd-kit/core";
import type { TableHouseholdSummaryDto } from "@invitation-app/shared";

export function HouseholdChip({ household }: { household: TableHouseholdSummaryDto }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: household.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="px-3 py-1.5 bg-white border rounded-md shadow-sm text-sm cursor-grab"
    >
      {household.displayName} ({household.confirmedCount ?? household.allocatedSeats})
    </div>
  );
}
