import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("porte le titre de la page en h1, en police d'affichage", () => {
    render(<PageHeader title="Foyers invités" />);
    const titre = screen.getByRole("heading", { level: 1, name: "Foyers invités" });
    expect(titre.className).toContain("font-display");
  });

  it("affiche le sous-titre et l'action quand on les donne", () => {
    render(
      <PageHeader
        title="Foyers invités"
        subtitle="40 foyers"
        action={<button type="button">Ajouter un foyer</button>}
      />,
    );
    expect(screen.getByText("40 foyers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter un foyer" })).toBeInTheDocument();
  });

  it("n'ajoute aucun paragraphe vide sans sous-titre", () => {
    const { container } = render(<PageHeader title="Foyers invités" />);
    expect(container.querySelector("p")).toBeNull();
  });

  // L'action reste à droite du titre même sur un téléphone de 375 px : la
  // rangée ne passe pas à la ligne, c'est le bloc du titre qui se resserre.
  it("garde l'action sur la même rangée que le titre", () => {
    render(<PageHeader title="Foyers invités" action={<button type="button">Ajouter</button>} />);
    const rangee = screen.getByRole("banner");
    expect(rangee.className).toMatch(/\bflex\b/);
    expect(rangee.className).toContain("justify-between");
    expect(rangee.className).not.toContain("flex-wrap");
  });

  it("se colle en haut de l'écran sur téléphone seulement, sur fond de page et avec un filet", () => {
    render(<PageHeader title="Foyers invités" sticky />);
    const entete = screen.getByRole("banner");
    expect(entete.className).toContain("max-md:sticky");
    expect(entete.className).toContain("max-md:top-0");
    expect(entete.className).toContain("bg-page");
    expect(entete.className).toContain("border-b");
    // Une classe `sticky` sans préfixe le collerait aussi sur bureau.
    expect(entete.className).not.toMatch(/(^|\s)sticky(\s|$)/);
  });

  it("ne se colle nulle part sans `sticky`", () => {
    render(<PageHeader title="Foyers invités" />);
    expect(screen.getByRole("banner").className).not.toContain("sticky");
  });
});
