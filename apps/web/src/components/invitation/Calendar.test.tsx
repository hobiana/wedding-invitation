import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "./Calendar";

const CEREMONY = "2027-01-02T06:00:00.000Z";

describe("Calendar", () => {
  it("names the month of the wedding", () => {
    const { container } = render(<Calendar weddingDate={CEREMONY} />);

    expect(container).toHaveTextContent("janvier 2027");
  });

  // Les cellules une par une, jamais le texte de la page : « 22 23 24 » collé
  // bout à bout contient « 32 », et une assertion sur le texte entier
  // attraperait des jours qui n'existent pas.
  it("draws the whole month, and only the month", () => {
    const { container } = render(<Calendar weddingDate={CEREMONY} />);

    const cellules = [...container.querySelectorAll("td")];
    // 5 semaines de 7 cases pour janvier 2027.
    expect(cellules).toHaveLength(35);

    // Le cœur est posé dans la cellule du 2 : c'est l'ornement, pas le jour.
    const jours = cellules.map((c) => c.textContent?.replace("♥", "").trim()).filter(Boolean);
    expect(jours).toEqual(Array.from({ length: 31 }, (_, i) => String(i + 1)));
  });

  it("marks the wedding day, and no other", () => {
    const { container } = render(<Calendar weddingDate={CEREMONY} />);

    const marques = container.querySelectorAll("[data-jour-du-mariage]");
    expect(marques).toHaveLength(1);
    expect(marques[0]).toHaveTextContent("2");
  });

  // Il suit la date comme le reste : rien n'est dessiné à la main.
  it("follows the wedding date to another month", () => {
    const { container } = render(<Calendar weddingDate="2027-02-15T06:00:00.000Z" />);

    expect(container).toHaveTextContent("février 2027");
    expect(container.querySelector("[data-jour-du-mariage]")).toHaveTextContent("15");
  });

  /**
   * Le calendrier ne dit rien que la page ne dise déjà deux fois — le
   * faire-part donne la date en toutes lettres, le programme donne l'heure.
   * C'est un ornement. Lu à voix haute, il ferait épeler trente-et-un nombres
   * entre deux informations utiles.
   */
  it("stays silent, being a picture of something already said twice", () => {
    render(<Calendar weddingDate={CEREMONY} />);

    expect(screen.getByTestId("calendrier")).toHaveAttribute("aria-hidden", "true");
  });
});
