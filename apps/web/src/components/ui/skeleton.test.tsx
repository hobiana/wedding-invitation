import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  // Un lecteur d'écran n'a rien à annoncer d'une forme d'attente : c'est la
  // région vivante de la page qui dit « Chargement… », une fois.
  it("stays out of the accessibility tree", () => {
    render(<Skeleton className="h-6 w-40" />);
    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  // La règle du design system : rien n'anime dans l'admin. Un squelette qui
  // pulse est exactement le réflexe qu'elle interdit.
  it("does not pulse", () => {
    render(<Skeleton className="h-6 w-40" />);
    expect(screen.getByTestId("skeleton").className).not.toMatch(/animate-/);
  });

  it("takes the dimensions of what is being waited for", () => {
    render(<Skeleton className="h-6 w-40" />);
    const forme = screen.getByTestId("skeleton");
    expect(forme.className).toContain("h-6");
    expect(forme.className).toContain("w-40");
  });
});
