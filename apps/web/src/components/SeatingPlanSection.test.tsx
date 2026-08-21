import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeatingPlanSection } from "./SeatingPlanSection";

describe("SeatingPlanSection", () => {
  it("renders nothing when seatingPlan is null", () => {
    const { container } = render(<SeatingPlanSection seatingPlan={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the table name and neighbors when activated", () => {
    render(
      <SeatingPlanSection
        seatingPlan={{ tableName: "Table 3", neighbors: [{ displayName: "Famille B", confirmedCount: 2 }] }}
      />,
    );
    expect(screen.getByText(/table 3/i)).toBeInTheDocument();
    expect(screen.getByText(/famille b/i)).toBeInTheDocument();
  });
});
