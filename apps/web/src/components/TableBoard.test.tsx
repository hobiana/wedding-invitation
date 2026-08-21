import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TableDto } from "@invitation-app/shared";
import { TableBoard } from "./TableBoard";

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
