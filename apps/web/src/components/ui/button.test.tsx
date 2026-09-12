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

  // Le commanditaire a levé le 2026-09-12 sa propre règle « pas de second rouge
  // à côté du bordeaux », pour ce bouton et pour lui seul. La raison, mesurée à
  // l'écran : en `bordeaux-900`, il ne se distinguait du primaire en
  // `bordeaux-700` que de 1,43:1.
  //
  // Ce test dit la règle actuelle. L'ancienne version affirmait l'inverse et
  // interdisait tout `red-*` — la remettre reviendrait à défaire un arbitrage.
  it("carries the destructive action in the danger red, not in a second bordeaux", () => {
    render(<Button variant="destructive">Supprimer le foyer</Button>);
    const bouton = screen.getByRole("button", { name: "Supprimer le foyer" });
    expect(bouton.className).toContain("bg-danger");
    expect(bouton.className).not.toMatch(/(^|\s)bg-bordeaux-/);
  });

  // Le jeton reste la seule source du rouge : un `red-600` de Tailwind planté en
  // dur rouvrirait la porte à un second rouge, celui que la règle levée visait.
  it("takes its red from the theme token, never from a Tailwind palette", () => {
    render(<Button variant="destructive">Supprimer le foyer</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/(red|rose|orange)-\d{2,3}/);
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
