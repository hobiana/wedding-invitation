import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("draws the surface radius, not the control radius", () => {
    render(<Card data-testid="carte">Rakotomavo</Card>);
    const carte = screen.getByTestId("carte");
    expect(carte.className).toContain("rounded-surface");
    expect(carte.className).not.toMatch(/rounded-(md|lg|sm|xl|full)\b/);
  });

  it("lets a caller add classes without losing its own", () => {
    render(<Card data-testid="carte" className="p-8">Rakotomavo</Card>);
    const carte = screen.getByTestId("carte");
    expect(carte.className).toContain("p-8");
    expect(carte.className).toContain("border-rule");
  });

  it("forwards the rest of its props to the element", () => {
    render(<Card data-testid="carte" aria-label="Foyer" />);
    expect(screen.getByTestId("carte")).toHaveAttribute("aria-label", "Foyer");
  });
});
