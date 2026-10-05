import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { FeuilleChoixDeTable, type FoyerADeplacer } from "./FeuilleChoixDeTable";

function assis(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "x", displayName: "Famille X", allocatedSeats: 1, confirmedCount: 1, status: "CONFIRMED", ...partiel };
}
function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t", name: "Table", capacity: 8, households: [], ...partiel };
}

const RAKOTO = { id: "r", displayName: "Famille Rakoto", allocatedSeats: 5, confirmedCount: 5, status: "CONFIRMED" } as const;

// Les trois lignes de la maquette : trop petite, complète, disponible.
const TABLES = [
  table({ id: "honneur", name: "Table d'honneur", households: [assis({ allocatedSeats: 5, confirmedCount: 5 })] }),
  table({ id: "fac", name: "Amis de fac", capacity: 10, households: [assis({ allocatedSeats: 10, confirmedCount: 10 })] }),
  table({ id: "collegues", name: "Collègues", capacity: 5 }),
];

function rendre(enJeu: FoyerADeplacer | null = { foyer: RAKOTO, depuis: null }, tables = TABLES) {
  const onChoisir = vi.fn();
  const onFermer = vi.fn();
  render(<FeuilleChoixDeTable enJeu={enJeu} tables={tables} onChoisir={onChoisir} onFermer={onFermer} />);
  return { onChoisir, onFermer, utilisateur: userEvent.setup() };
}

describe("FeuilleChoixDeTable", () => {
  it("is named after the household and says how many seats it needs", () => {
    rendre();
    const feuille = screen.getByRole("dialog", { name: "Famille Rakoto" });
    expect(feuille).toHaveAccessibleDescription("5 places à placer");
    expect(within(feuille).getByText("Placer")).toBeInTheDocument();
  });

  it("renders nothing when no household is being placed", () => {
    rendre(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lists an available table with its free seats, and seats the household there on a tap", async () => {
    const { onChoisir, utilisateur } = rendre();
    const ligne = screen.getByRole("button", { name: /^Collègues/ });
    expect(ligne).toHaveTextContent("5 places libres");
    expect(ligne).not.toHaveAttribute("aria-disabled");
    await utilisateur.click(ligne);
    expect(onChoisir).toHaveBeenCalledWith(TABLES[2]);
  });

  // L'état se lit dans le texte, pas dans la seule teinte estompée.
  it("disables a table too small, and says so in words", async () => {
    const { onChoisir, utilisateur } = rendre();
    const ligne = screen.getByRole("button", { name: /^Table d'honneur/ });
    expect(ligne).toHaveTextContent("3 places libres · trop petite");
    expect(ligne).toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(ligne);
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("disables a full table, and says it is full", async () => {
    const { onChoisir, utilisateur } = rendre();
    const ligne = screen.getByRole("button", { name: /^Amis de fac/ });
    expect(ligne).toHaveTextContent("Complète");
    expect(ligne).toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(ligne);
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("agrees « 1 place libre » in the singular", () => {
    rendre({ foyer: RAKOTO, depuis: null }, [table({ name: "Famille Rabe", capacity: 2, households: [assis()] })]);
    expect(screen.getByRole("button", { name: /^Famille Rabe/ })).toHaveTextContent("1 place libre · trop petite");
  });

  // « Déplacer » : la table où il est assis n'est pas un choix.
  it("leaves out the table the household is moving from", () => {
    rendre({ foyer: RAKOTO, depuis: "collegues" });
    const feuille = screen.getByRole("dialog", { name: "Famille Rakoto" });
    expect(within(feuille).getByText("Déplacer")).toBeInTheDocument();
    expect(feuille).toHaveAccessibleDescription("5 places à déplacer");
    expect(within(feuille).getByRole("button", { name: /^Table d'honneur/ })).toBeInTheDocument();
    expect(within(feuille).queryByRole("button", { name: /^Collègues/ })).not.toBeInTheDocument();
  });

  it("says there is no table yet, and where to make one", () => {
    rendre({ foyer: RAKOTO, depuis: null }, []);
    expect(screen.getByText("Aucune table pour l'instant : créez-en une dans l'onglet Tables.")).toBeInTheDocument();
  });

  it("closes with its close button", async () => {
    const { onFermer, utilisateur } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onFermer).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const { onFermer, utilisateur } = rendre();
    await utilisateur.keyboard("{Escape}");
    expect(onFermer).toHaveBeenCalled();
  });

  it("closes on a tap on the dimmed backdrop", async () => {
    const { onFermer, utilisateur } = rendre();
    await utilisateur.click(document.querySelector("[data-feuille-fond]") as HTMLElement);
    expect(onFermer).toHaveBeenCalled();
  });

  it("traps the focus inside the sheet", () => {
    rendre();
    expect(screen.getByRole("dialog", { name: "Famille Rakoto" })).toContainElement(document.activeElement as HTMLElement);
  });

  it("gives the focus back to the button that opened it", async () => {
    function Banc() {
      const [enJeu, setEnJeu] = useState<FoyerADeplacer | null>(null);
      return (
        <>
          <button type="button" onClick={() => setEnJeu({ foyer: RAKOTO, depuis: null })}>
            Placer Famille Rakoto
          </button>
          <FeuilleChoixDeTable enJeu={enJeu} tables={TABLES} onChoisir={vi.fn()} onFermer={() => setEnJeu(null)} />
        </>
      );
    }
    const utilisateur = userEvent.setup();
    render(<Banc />);
    await utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await utilisateur.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Placer Famille Rakoto" })).toHaveFocus();
  });
});
