import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Venue } from "./Venue";

const LIEU = {
  venueName: "Espace Ny Akanintsika",
  address: "Antananarivo, Madagascar",
  mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Espace+Ny+Akanintsika",
};

describe("Venue", () => {
  it("names the place and its address, from the settings the organiser typed", () => {
    render(<Venue {...LIEU} />);

    expect(screen.getByRole("heading", { name: "Espace Ny Akanintsika" })).toBeInTheDocument();
    expect(screen.getByText("Antananarivo, Madagascar")).toBeInTheDocument();
  });

  it("offers the route, and warns that it leaves the page", () => {
    render(<Venue {...LIEU} />);

    const lien = screen.getByRole("link", { name: /itinéraire/i });
    expect(lien).toHaveAttribute("href", LIEU.mapUrl);
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(lien).toHaveTextContent(/nouvel onglet/i);
  });

  /**
   * Le design posait ici un carré gris hachuré portant « carte du lieu ·
   * capture ». C'est une vraie carte maintenant — mais elle se construit à
   * partir du **nom et de l'adresse** saisis par l'organisateur, pas de
   * `mapUrl` qui est du texte libre et peut pointer n'importe où. Si le lieu
   * change dans l'admin, la carte suit.
   */
  it("embeds a real map built from the venue the organiser typed", () => {
    render(<Venue {...LIEU} />);

    const carte = screen.getByTitle(/carte — espace ny akanintsika/i);
    const src = carte.getAttribute("src") ?? "";
    expect(src).toContain(encodeURIComponent("Espace Ny Akanintsika, Antananarivo, Madagascar"));
    // Elle est loin dans la page : personne ne paie une carte qu'il ne verra pas.
    expect(carte).toHaveAttribute("loading", "lazy");
  });

  it("still shows the map when no directions URL was filled in", () => {
    render(<Venue {...LIEU} mapUrl={null} />);

    // La carte vient de l'adresse, le lien vient du champ libre : le second
    // peut manquer sans emporter le premier.
    expect(screen.getByTitle(/carte —/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /itinéraire/i })).toBeNull();
    expect(screen.queryByText(/capture|carte du lieu ·/i)).toBeNull();
    expect(screen.getByRole("heading", { name: "Espace Ny Akanintsika" })).toBeInTheDocument();
  });

  // Le champ est du texte libre dans l'admin, et cette page n'a aucune garde
  // devant elle.
  it("drops a mapUrl that is not a plain web address", () => {
    render(<Venue {...LIEU} mapUrl="javascript:alert(1)" />);

    expect(screen.queryByRole("link", { name: /itinéraire/i })).toBeNull();
  });
});
