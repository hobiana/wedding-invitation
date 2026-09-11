import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Schedule } from "./Schedule";

/** 06:00 UTC = 9 h à Antananarivo. */
const CEREMONY = "2027-01-02T06:00:00.000Z";

const realTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = realTz;
});

describe("Schedule", () => {
  // L'ordre est l'information : on ne va pas à la réception avant l'église.
  it("lays out the three moments of the day, in order", () => {
    render(<Schedule weddingDate={CEREMONY} />);

    const moments = screen.getAllByRole("listitem");
    expect(moments).toHaveLength(3);
    expect(moments[0]).toHaveTextContent("Cérémonie religieuse");
    expect(moments[1]).toHaveTextContent("Départ vers l'espace");
    expect(moments[2]).toHaveTextContent("Réception");
  });

  /**
   * L'heure de la cérémonie n'est pas dans `SCHEDULE` : elle est `null` là-bas
   * et vient de l'API ici. Recopier « 9 h » dans les constantes aurait créé
   * deux vérités, qui divergent au premier ajustement — et c'est l'heure à
   * laquelle les gens doivent être assis dans une église.
   */
  it("takes the ceremony's hour from the wedding date, not from a constant", () => {
    render(<Schedule weddingDate="2027-01-02T07:30:00.000Z" />);

    expect(screen.getByText(/10\s*h\s*30/)).toBeInTheDocument();
    expect(screen.queryByText(/^9\s*h/)).toBeNull();
  });

  it.each(["Indian/Antananarivo", "Europe/Paris", "America/New_York"])(
    "reads the venue's clock for a guest in %s",
    (tz) => {
      process.env.TZ = tz;
      render(<Schedule weddingDate={CEREMONY} />);

      expect(screen.getByText(/9\s*h\s*00/)).toBeInTheDocument();
    },
  );

  // Les deux autres moments sont du texte fixe : ils n'ont pas d'heure en base
  // et n'en auront pas. « Midi » est une heure de faire-part, pas un horaire.
  it("keeps the two written hours as they are", () => {
    render(<Schedule weddingDate={CEREMONY} />);

    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("13 h")).toBeInTheDocument();
  });

  /**
   * Le défaut n'a été vu qu'à la première exécution réelle : un invité à Paris
   * lisait 7 h pour une cérémonie à 9 h. Aucun test ne pouvait l'attraper — ils
   * tournent tous dans le fuseau de la machine. La parenthèse permanente coûte
   * une ligne et supprime toute une classe d'ambiguïté.
   */
  it("names the clock its hours are given on", () => {
    render(<Schedule weddingDate={CEREMONY} />);

    expect(screen.getByText(/heure de Madagascar/i)).toBeInTheDocument();
  });

  it("is a section a screen reader can jump to", () => {
    render(<Schedule weddingDate={CEREMONY} />);

    expect(screen.getByRole("heading", { name: /le déroulé du jour/i })).toBeInTheDocument();
  });
});
