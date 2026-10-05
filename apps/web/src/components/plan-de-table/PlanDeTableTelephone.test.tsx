import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import type { FoyerAPlacer } from "./HouseholdCard";
import { PlanDeTableTelephone, type PlanDeTableTelephoneProps } from "./PlanDeTableTelephone";

function foyer(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "h", displayName: "Famille", allocatedSeats: 2, confirmedCount: 2, status: "CONFIRMED", ...partiel };
}
function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t", name: "Table", capacity: 8, households: [], ...partiel };
}

const RAKOTO: FoyerAPlacer = { id: "r", displayName: "Famille Rakoto", allocatedSeats: 5, confirmedCount: 5, status: "CONFIRMED" };
const LEROY: FoyerAPlacer = { id: "l", displayName: "Thomas Leroy", allocatedSeats: 1, confirmedCount: null, status: "PENDING" };
const MARTIN = foyer({ id: "m", displayName: "Famille Martin", allocatedSeats: 3, confirmedCount: null, status: "PENDING" });

const HONNEUR = table({ id: "honneur", name: "Table d'honneur", households: [MARTIN] });
const COLLEGUES = table({ id: "collegues", name: "Collègues", capacity: 6 });

function props(partiel: Partial<PlanDeTableTelephoneProps> = {}): PlanDeTableTelephoneProps {
  return {
    tables: [HONNEUR, COLLEGUES],
    aPlacer: [LEROY, RAKOTO],
    onAssign: vi.fn(),
    onUnassign: vi.fn(),
    onCreateTable: vi.fn().mockResolvedValue(true),
    onUpdateTable: vi.fn().mockResolvedValue(true),
    onDeleteTable: vi.fn(),
    ...partiel,
  };
}

function rendre(partiel: Partial<PlanDeTableTelephoneProps> = {}) {
  const p = props(partiel);
  const vue = render(<PlanDeTableTelephone {...p} />);
  return { ...p, ...vue, utilisateur: userEvent.setup() };
}

const onglet = (nom: RegExp | string) => screen.getByRole("tab", { name: nom });

describe("PlanDeTableTelephone — header and tabs", () => {
  it("titles the page and sums up the plan", () => {
    rendre();
    expect(screen.getByRole("heading", { level: 1, name: "Plan de table" })).toBeInTheDocument();
    expect(screen.getByText("3 / 14 places attribuées · 2 foyers à placer")).toBeInTheDocument();
  });

  it("agrees « 1 foyer à placer » in the singular", () => {
    rendre({ aPlacer: [RAKOTO] });
    expect(screen.getByText("3 / 14 places attribuées · 1 foyer à placer")).toBeInTheDocument();
  });

  it("opens on « À placer », counting both lists in the tabs", () => {
    rendre();
    expect(onglet("À placer · 2")).toHaveAttribute("aria-selected", "true");
    expect(onglet("Tables · 2")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel", { name: "À placer · 2" })).toBeInTheDocument();
  });

  it("lists the households to seat, with their seats", () => {
    rendre();
    const panneau = within(screen.getByRole("tabpanel"));
    expect(within(panneau.getByRole("group", { name: "Thomas Leroy" })).getByText("1 place · en attente")).toBeInTheDocument();
    expect(within(panneau.getByRole("group", { name: "Famille Rakoto" })).getByText("5 places")).toBeInTheDocument();
  });

  it("says when every household is seated", () => {
    rendre({ aPlacer: [] });
    expect(screen.getByText("Tous les foyers sont placés.")).toBeInTheDocument();
  });
});

describe("PlanDeTableTelephone — placing", () => {
  it("opens the sheet for the household tapped", async () => {
    const { utilisateur } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    expect(screen.getByRole("dialog", { name: "Famille Rakoto" })).toHaveAccessibleDescription("5 places à placer");
  });

  it("seats the household at the available table tapped, and closes the sheet", async () => {
    const { utilisateur, onAssign } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    await utilisateur.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Collègues/ }));
    expect(onAssign).toHaveBeenCalledWith("collegues", "r");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does nothing on a table too small", async () => {
    const { utilisateur, onAssign } = rendre({ tables: [table({ id: "petite", name: "Petite", capacity: 4 })] });
    await utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    const petite = within(screen.getByRole("dialog")).getByRole("button", { name: /^Petite/ });
    expect(petite).toHaveTextContent("4 places libres · trop petite");
    await utilisateur.click(petite);
    expect(onAssign).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // Le foyer quitte « À placer » : son bouton est démonté au rechargement. Le
  // focus attend sur l'onglet, qui annonce le nouveau compte.
  it("puts the focus on the « À placer » tab once the household has left the list", async () => {
    const { utilisateur, rerender, ...p } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    await utilisateur.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Collègues/ }));
    rerender(
      <PlanDeTableTelephone
        {...props({ onAssign: p.onAssign })}
        tables={[HONNEUR, { ...COLLEGUES, households: [foyer({ id: "r", displayName: "Famille Rakoto", allocatedSeats: 5 })] }]}
        aPlacer={[LEROY]}
      />,
    );
    expect(onglet("À placer · 1")).toHaveFocus();
  });

  // Un refus du serveur ne déplace pas le foyer : rien n'est volé.
  it("leaves the focus alone when the household did not move", async () => {
    const { utilisateur, rerender } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    await utilisateur.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Collègues/ }));
    rerender(<PlanDeTableTelephone {...props()} />);
    expect(screen.getByRole("button", { name: "Placer Famille Rakoto" })).toHaveFocus();
  });
});

describe("PlanDeTableTelephone — tables", () => {
  async function ouvrirTables(utilisateur: ReturnType<typeof userEvent.setup>) {
    await utilisateur.click(onglet(/^Tables/));
  }

  it("folds every table by default", async () => {
    const { utilisateur } = rendre();
    await ouvrirTables(utilisateur);
    expect(screen.getByRole("button", { name: /^Table d'honneur/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /^Collègues/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("moves a seated household through the sheet, leaving out its own table", async () => {
    const { utilisateur, onAssign } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: /^Table d'honneur/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Déplacer Famille Martin" }));
    const feuille = within(screen.getByRole("dialog", { name: "Famille Martin" }));
    expect(feuille.queryByRole("button", { name: /^Table d'honneur/ })).not.toBeInTheDocument();
    await utilisateur.click(feuille.getByRole("button", { name: /^Collègues/ }));
    expect(onAssign).toHaveBeenCalledWith("collegues", "m");
  });

  it("follows a moved household to the table it arrived at", async () => {
    const { utilisateur, rerender } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: /^Table d'honneur/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Déplacer Famille Martin" }));
    await utilisateur.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Collègues/ }));
    rerender(
      <PlanDeTableTelephone {...props()} tables={[{ ...HONNEUR, households: [] }, { ...COLLEGUES, households: [MARTIN] }]} />,
    );
    expect(screen.getByRole("button", { name: /^Collègues/ })).toHaveFocus();
  });

  it("removes a household with ×, then keeps the focus on its table", async () => {
    const { utilisateur, onUnassign, rerender } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: /^Table d'honneur/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Retirer Famille Martin de la table « Table d'honneur »" }));
    expect(onUnassign).toHaveBeenCalledWith("m");
    rerender(<PlanDeTableTelephone {...props()} tables={[{ ...HONNEUR, households: [] }, COLLEGUES]} />);
    expect(screen.getByRole("button", { name: /^Table d'honneur/ })).toHaveFocus();
  });

  it("saves a new capacity through the page", async () => {
    const { utilisateur, onUpdateTable } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: /^Collègues/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Ajouter une place" }));
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer la capacité" }));
    expect(onUpdateTable).toHaveBeenCalledWith("collegues", { name: "Collègues", capacity: 7 });
  });

  it("asks the page to delete a table", async () => {
    const { utilisateur, onDeleteTable } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: /^Collègues/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table « Collègues »" }));
    expect(onDeleteTable).toHaveBeenCalledWith(COLLEGUES);
  });

  // La table supprimée emporte le bouton qui avait le focus : il ne doit pas
  // tomber sur `<body>`.
  it("puts the focus on the « Tables » tab once a table is gone", async () => {
    const { utilisateur, rerender } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: /^Collègues/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table « Collègues »" }));
    rerender(<PlanDeTableTelephone {...props()} tables={[HONNEUR]} />);
    expect(onglet("Tables · 1")).toHaveFocus();
  });

  it("creates a table from a draft named after the next number, then gives the focus back", async () => {
    const { utilisateur, onCreateTable } = rendre();
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    expect(screen.getByLabelText("Nom")).toHaveValue("Table 3");
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(onCreateTable).toHaveBeenCalledWith({ name: "Table 3", capacity: 10 });
    expect(await screen.findByRole("button", { name: "Nouvelle table" })).toHaveFocus();
    expect(screen.queryByRole("form", { name: "Nouvelle table" })).not.toBeInTheDocument();
  });

  it("keeps the draft when the table could not be created", async () => {
    const { utilisateur } = rendre({ onCreateTable: vi.fn().mockResolvedValue(false) });
    await ouvrirTables(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(await screen.findByRole("form", { name: "Nouvelle table" })).toBeInTheDocument();
  });

  it("explains an empty plan", async () => {
    const { utilisateur } = rendre({ tables: [] });
    await ouvrirTables(utilisateur);
    expect(screen.getByText("Aucune table pour l'instant : créez la première, les foyers pourront ensuite y être placés.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouvelle table" })).toBeInTheDocument();
  });
});
