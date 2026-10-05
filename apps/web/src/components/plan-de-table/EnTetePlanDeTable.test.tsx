import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnTetePlanDeTable } from "./EnTetePlanDeTable";

const BILAN = { placesAttribuees: 35, placesTotales: 52, foyersAPlacer: 6, placesAPlacer: 16 };

describe("EnTetePlanDeTable", () => {
  it("titles the page", () => {
    render(<EnTetePlanDeTable />);
    expect(screen.getByRole("heading", { level: 1, name: "Plan de table" })).toBeInTheDocument();
  });

  // Le jour du mariage, à l'heure de Madagascar.
  it("labels the reception with the wedding day", () => {
    render(<EnTetePlanDeTable dateDuMariage="2027-01-02T06:00:00.000Z" />);
    expect(screen.getByText("Réception · 2 janvier")).toBeInTheDocument();
  });

  // Les réglages n'ont pas chargé : l'étiquette s'efface, l'écran reste.
  it("omits the label when the date is missing or unreadable", () => {
    const { rerender } = render(<EnTetePlanDeTable dateDuMariage="2027-01-02T06:00:00.000Z" />);
    expect(screen.getByText(/Réception/)).toBeInTheDocument();
    rerender(<EnTetePlanDeTable dateDuMariage="n'importe quoi" />);
    expect(screen.queryByText(/Réception/)).not.toBeInTheDocument();
  });

  it("gives the seats assigned and the households left to seat", () => {
    render(<EnTetePlanDeTable bilan={BILAN} />);
    const termes = screen.getAllByRole("term").map((t) => t.textContent);
    const valeurs = screen.getAllByRole("definition").map((d) => d.textContent);
    expect(termes).toEqual(["places attribuées", "foyers à placer"]);
    expect(valeurs).toEqual(["35 / 52", "6"]);
  });

  it("agrees a single household left to seat", () => {
    render(<EnTetePlanDeTable bilan={{ ...BILAN, foyersAPlacer: 1 }} />);
    expect(screen.getByText("foyer à placer")).toBeInTheDocument();
  });
});
