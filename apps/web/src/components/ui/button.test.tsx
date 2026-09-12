import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("carries the admin primary in bordeaux, not in a neutral", () => {
    render(<Button>Enregistrer</Button>);
    const bouton = screen.getByRole("button", { name: "Enregistrer" });
    expect(bouton.className).toContain("bg-bordeaux-700");
    expect(bouton.className).not.toMatch(/bg-neutral-/);
  });

  // La direction artistique interdit un second rouge à côté du bordeaux, et
  // `Field` peint déjà ses erreurs en bordeaux pour cette raison. Le bouton
  // destructif tire donc son autorité de son libellé et du bordeaux profond.
  it("never reaches for a second red on the destructive action", () => {
    render(<Button variant="destructive">Supprimer le foyer</Button>);
    const bouton = screen.getByRole("button", { name: "Supprimer le foyer" });
    expect(bouton.className).not.toMatch(/(red|rose|orange)-\d{2,3}/);
    expect(bouton.className).toContain("bg-bordeaux-900");
  });

  it("uses the control radius", () => {
    render(<Button>Enregistrer</Button>);
    expect(screen.getByRole("button").className).toContain("rounded-control");
  });

  it("still renders as a child element when asked", () => {
    render(
      <Button asChild>
        <a href="/admin">Retour</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Retour" }).className).toContain("bg-bordeaux-700");
  });
});
