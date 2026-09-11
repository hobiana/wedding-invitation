import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PetalRain } from "./PetalRain";

function stubReducedMotion(reduce: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

afterEach(() => vi.restoreAllMocks());

describe("PetalRain", () => {
  it("seeds a rain of petals, each with its own fall and sway", () => {
    render(<PetalRain />);

    const couche = screen.getByTestId("petales");
    const petales = [...couche.children];
    expect(petales.length).toBeGreaterThanOrEqual(16);

    // Chacun tombe à sa vitesse et depuis sa propre position : deux pétales
    // synchronisés se lisent comme un défaut de rendu, pas comme une pluie.
    const chutes = petales.map((p) => (p as HTMLElement).style.animation);
    expect(new Set(chutes).size).toBeGreaterThan(petales.length / 2);
    const departs = petales.map((p) => (p as HTMLElement).style.left);
    expect(new Set(departs).size).toBe(petales.length);
  });

  /**
   * **Le test qui compte dans ce fichier.**
   *
   * Ce calque couvre la fenêtre entière, formulaire de réponse compris, et il
   * est au-dessus de tout. Sans `pointer-events: none` il avale chaque clic de
   * la page : l'invité voit le formulaire, appuie, et rien ne se passe — et il
   * ne le signalera pas, il ne répondra simplement pas.
   */
  it("never swallows a click meant for the invitation", () => {
    render(<PetalRain />);

    const couche = screen.getByTestId("petales");
    expect(couche.className).toContain("pointer-events-none");
  });

  /** Du décor : il n'a rien à dire, et surtout rien à dire avant les prénoms. */
  it("stays silent for assistive technology", () => {
    render(<PetalRain />);

    expect(screen.getByTestId("petales")).toHaveAttribute("aria-hidden", "true");
  });

  /**
   * C'est la seule animation de la page qui ne s'arrête **jamais** — donc celle
   * qu'un invité ayant demandé moins de mouvement doit le moins subir. Elle
   * n'est pas neutralisée après coup : elle n'est pas montée du tout.
   */
  it("does not exist at all for a guest who asked for less movement", () => {
    const restore = stubReducedMotion(true);
    try {
      const { container } = render(<PetalRain />);
      expect(container).toBeEmptyDOMElement();
    } finally {
      restore();
    }
  });
});
