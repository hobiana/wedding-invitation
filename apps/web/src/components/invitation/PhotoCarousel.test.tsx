import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoCarousel } from "./PhotoCarousel";

/** La photo montrée, au sens où un lecteur d'écran la verrait. */
function photoCourante() {
  return screen.getByRole("figure").getAttribute("data-photo");
}

const clic = (nom: RegExp) => fireEvent.click(screen.getByRole("button", { name: nom }));

describe("PhotoCarousel", () => {
  it("carries all three photographs, each described", () => {
    const { container } = render(<PhotoCarousel />);

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(3);
    images.forEach((image) => {
      expect(image.getAttribute("alt")).toMatch(/hobiana et lovasoa/i);
    });
  });

  it("starts on the first photograph", () => {
    render(<PhotoCarousel />);

    expect(photoCourante()).toBe("0");
  });

  it("moves forward, and comes back round", () => {
    render(<PhotoCarousel />);

    clic(/photo suivante/i);
    expect(photoCourante()).toBe("1");
    clic(/photo suivante/i);
    expect(photoCourante()).toBe("2");
    // Trois photos, pas de cul-de-sac : on revient à la première.
    clic(/photo suivante/i);
    expect(photoCourante()).toBe("0");
  });

  it("moves back from the first to the last", () => {
    render(<PhotoCarousel />);

    clic(/photo précédente/i);
    expect(photoCourante()).toBe("2");
  });

  it("jumps straight to a photograph from its dot, and says which is showing", () => {
    render(<PhotoCarousel />);

    clic(/aller à la photo 3/i);

    expect(photoCourante()).toBe("2");
    expect(screen.getByRole("button", { name: /aller à la photo 3/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  /**
   * Les deux photos écartées restent dans le DOM — c'est ce qui permet la
   * transition en profondeur. Elles sont masquées pour les technologies
   * d'assistance : autrement la page annoncerait trois photos superposées,
   * dont deux que personne ne regarde. `getByRole` au singulier échouerait
   * s'il en trouvait deux.
   */
  it("exposes only the photograph on top", () => {
    render(<PhotoCarousel />);

    expect(screen.getAllByRole("figure", { hidden: true })).toHaveLength(3);
    expect(screen.getAllByRole("figure")).toHaveLength(1);
  });
});
