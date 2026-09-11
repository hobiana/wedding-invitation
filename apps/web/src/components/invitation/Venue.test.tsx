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
   * capture ». Une fausse carte est pire que pas de carte : elle promet une
   * image qui n'arrivera jamais, et un invité qui la touche ne comprend pas
   * pourquoi rien ne se passe. Ce qu'on avait déjà, c'est le lien.
   */
  it("shows no map placeholder when there is no map", () => {
    render(<Venue {...LIEU} mapUrl={null} />);

    expect(screen.queryByRole("link", { name: /itinéraire/i })).toBeNull();
    expect(screen.queryByText(/capture|carte du lieu/i)).toBeNull();
    // Le lieu et l'adresse restent : c'est l'information, le lien n'est que
    // la commodité.
    expect(screen.getByRole("heading", { name: "Espace Ny Akanintsika" })).toBeInTheDocument();
  });

  // Le champ est du texte libre dans l'admin, et cette page n'a aucune garde
  // devant elle.
  it("drops a mapUrl that is not a plain web address", () => {
    render(<Venue {...LIEU} mapUrl="javascript:alert(1)" />);

    expect(screen.queryByRole("link", { name: /itinéraire/i })).toBeNull();
  });
});
