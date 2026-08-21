import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import type { TableDto } from "@invitation-app/shared";
import { TableBoard, dragEndTarget } from "./TableBoard";

function dragEvent(overId: string | null): DragEndEvent {
  return {
    active: { id: "h1" },
    over: overId === null ? null : { id: overId },
  } as DragEndEvent;
}

const tables: TableDto[] = [
  {
    id: "t1",
    name: "Table 1",
    capacity: 10,
    households: [
      { id: "h1", displayName: "Famille A", allocatedSeats: 4, confirmedCount: 4, status: "CONFIRMED" },
    ],
  },
];

describe("TableBoard", () => {
  it("shows remaining seats for each table", () => {
    render(<TableBoard tables={tables} unassignedHouseholds={[]} onAssign={() => {}} onUnassign={() => {}} />);
    expect(screen.getByText(/4 \/ 10/)).toBeInTheDocument();
  });
});

describe("dragEndTarget", () => {
  it("does nothing when the drag was cancelled or released over dead space", () => {
    expect(dragEndTarget(dragEvent(null))).toBeNull();
  });

  it("unassigns only on an explicit drop on the unassigned zone", () => {
    expect(dragEndTarget(dragEvent("unassigned"))).toEqual({
      householdId: "h1",
      tableId: null,
    });
  });

  it("assigns to the table that was dropped on", () => {
    expect(dragEndTarget(dragEvent("t1"))).toEqual({ householdId: "h1", tableId: "t1" });
  });
});
