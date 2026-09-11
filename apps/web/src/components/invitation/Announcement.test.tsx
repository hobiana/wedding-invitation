import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Announcement } from "./Announcement";

/** 06:00 UTC = 9 h à Antananarivo, le samedi 2 janvier 2027. */
const CEREMONY = "2027-01-02T06:00:00.000Z";

const realTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = realTz;
});

describe("Announcement", () => {
  it("names both mothers, without a label above them", () => {
    render(<Announcement weddingDate={CEREMONY} />);

    expect(screen.getByText("Mme veuve Razafindraibe Razakanaivo")).toBeInTheDocument();
    expect(screen.getByText("Mme veuve Rasolonirina Ramarojaona")).toBeInTheDocument();
    // « Sa mère » deux fois laissait « sa » sans référent : retiré sur
    // arbitrage du commanditaire, et ce test empêche son retour par mégarde.
    expect(screen.queryByText(/sa mère/i)).toBeNull();
  });

  it("gives each spouse their full name and their role", () => {
    render(<Announcement weddingDate={CEREMONY} />);

    expect(screen.getByText("Hobiana Tojoniaina Razakanaivo")).toBeInTheDocument();
    expect(screen.getByText("Le marié")).toBeInTheDocument();
    expect(screen.getByText("Lovasoa Sahondraniaina Ramarojaona")).toBeInTheDocument();
    expect(screen.getByText("La mariée")).toBeInTheDocument();
  });

  // Le jour a deux adresses ; celle de l'API est la réception, qui porte le
  // plan de table. L'église n'existe que dans le texte du faire-part.
  it("names the church, which the API does not know", () => {
    render(<Announcement weddingDate={CEREMONY} />);

    expect(screen.getByText("Église FJKM Ambatobe")).toBeInTheDocument();
  });

  /**
   * Le cœur de ce composant : le design écrivait « Samedi 09h00 · 02 · Janvier
   * 2027 » en dur. Ces quatre valeurs viennent de la date passée en propriété,
   * et se lisent dans le fuseau du lieu, pas dans celui de l'invité.
   */
  it("builds the date block from the wedding date it is given", () => {
    render(<Announcement weddingDate={CEREMONY} />);
    const bloc = screen.getByTestId("bloc-date");

    expect(within(bloc).getByText("02")).toBeInTheDocument();
    expect(within(bloc).getByText(/samedi/i)).toBeInTheDocument();
    expect(within(bloc).getByText(/janvier/i)).toBeInTheDocument();
    expect(within(bloc).getByText(/2027/)).toBeInTheDocument();
    expect(within(bloc).getByText(/9\s*h/)).toBeInTheDocument();
  });

  // 22:00 UTC le 1er est déjà le 2 à Antananarivo. Un invité à New York doit
  // lire le même grand chiffre que les mariés.
  it("keeps the venue's calendar day for a guest several zones away", () => {
    process.env.TZ = "America/New_York";
    render(<Announcement weddingDate="2027-01-01T22:00:00.000Z" />);

    expect(within(screen.getByTestId("bloc-date")).getByText("02")).toBeInTheDocument();
  });

  // L'aquarelle ne dit rien que le texte ne dise : un lecteur d'écran qui
  // l'annoncerait interromprait la lecture du faire-part pour une fleur.
  it("keeps the watercolour silent to assistive technology", () => {
    const { container } = render(<Announcement weddingDate={CEREMONY} />);

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => expect(image).toHaveAttribute("alt", ""));
  });

  it("is a section a screen reader can jump to", () => {
    render(<Announcement weddingDate={CEREMONY} />);

    expect(screen.getByRole("heading", { name: /le faire-part/i })).toBeInTheDocument();
  });
});
