import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { PlanDeTableBureau, type PlanDeTableBureauProps } from "./PlanDeTableBureau";
import type { FoyerAPlacer } from "./HouseholdCard";

function assis(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "m", displayName: "Famille Martin", allocatedSeats: 3, confirmedCount: 3, status: "CONFIRMED", ...partiel };
}
function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t1", name: "Collègues", capacity: 8, households: [], ...partiel };
}
const rakoto: FoyerAPlacer = { id: "r", displayName: "Famille Rakoto", allocatedSeats: 5, confirmedCount: 5, status: "CONFIRMED" };

// Collègues : 8 places, 3 prises → 5 libres, Rakoto (5) y tient.
// Témoins : 4 places, vide → Rakoto n'y tient pas.
const TABLES = [
  table({ households: [assis()] }),
  table({ id: "t2", name: "Témoins", capacity: 4 }),
];

function props(partiel: Partial<PlanDeTableBureauProps> = {}): PlanDeTableBureauProps {
  return {
    tables: TABLES,
    aPlacer: [rakoto],
    onAssign: vi.fn(),
    onUnassign: vi.fn(),
    onCreateTable: vi.fn().mockResolvedValue(true),
    onUpdateTable: vi.fn().mockResolvedValue(true),
    onDeleteTable: vi.fn(),
    ...partiel,
  };
}
function rendre(partiel: Partial<PlanDeTableBureauProps> = {}) {
  const p = props(partiel);
  const vue = render(<PlanDeTableBureau {...p} />);
  return { ...p, ...vue, utilisateur: userEvent.setup() };
}
function rappelsDe(vue: PlanDeTableBureauProps): Partial<PlanDeTableBureauProps> {
  const { onAssign, onUnassign, onCreateTable, onUpdateTable, onDeleteTable } = vue;
  return { onAssign, onUnassign, onCreateTable, onUpdateTable, onDeleteTable };
}
const carteDeTable = (nom: string) => within(screen.getByRole("region", { name: nom }));

describe("PlanDeTableBureau", () => {
  it("lays out the households to place beside every table", () => {
    rendre();
    expect(screen.getByRole("group", { name: "Famille Rakoto" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Collègues" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Témoins" })).toBeInTheDocument();
  });

  // Décision du commanditaire : au bureau on déplace en glissant, ou en
  // retirant puis plaçant. Aucun bouton « Déplacer ».
  it("offers no « Déplacer » button for a seated household", () => {
    rendre();
    expect(carteDeTable("Collègues").getByRole("button", { name: /retirer famille martin/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /déplacer/i })).not.toBeInTheDocument();
  });

  it("explains an empty plan and still offers a new table", () => {
    rendre({ tables: [] });
    expect(screen.getByText(/Aucune table pour l'instant/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouvelle table" })).toBeInTheDocument();
  });
});

describe("PlanDeTableBureau « Où placer ? »", () => {
  async function choisirRakoto() {
    const vue = rendre();
    await vue.utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    return vue;
  }

  it("asks where to seat the household and highlights the tables it fits", async () => {
    await choisirRakoto();
    expect(screen.getByText(/Où placer/)).toHaveTextContent("Où placer Famille Rakoto ? (5 places)");
    expect(screen.getByRole("region", { name: "Collègues" })).toHaveAttribute("data-etat", "accueille");
    expect(carteDeTable("Collègues").getByRole("button", { name: /placer ici/i })).toBeInTheDocument();
    expect(carteDeTable("Témoins").getByText("Pas assez de places")).toBeInTheDocument();
    expect(carteDeTable("Témoins").queryByRole("button", { name: /placer ici/i })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Famille Rakoto" })).toHaveTextContent("Choisir une table →");
  });

  it("hides « Modifier la table » while choosing", async () => {
    await choisirRakoto();
    expect(screen.queryByRole("button", { name: /modifier la table/i })).not.toBeInTheDocument();
  });

  it("seats the household at the chosen table and keeps the focus on it", async () => {
    const { utilisateur, onAssign } = await choisirRakoto();
    await utilisateur.click(carteDeTable("Collègues").getByRole("button", { name: /placer ici/i }));
    expect(onAssign).toHaveBeenCalledWith("t1", "r");
    expect(screen.queryByText(/Où placer/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Placer Famille Rakoto" })).toHaveFocus();
  });

  it("cancels with « Annuler » without seating anyone, focus back on the household", async () => {
    const { utilisateur, onAssign } = await choisirRakoto();
    await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onAssign).not.toHaveBeenCalled();
    expect(screen.queryByText(/Où placer/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Placer Famille Rakoto" })).toHaveFocus();
  });

  it("cancels on Escape", async () => {
    const { utilisateur, onAssign } = await choisirRakoto();
    await utilisateur.keyboard("{Escape}");
    expect(screen.queryByText(/Où placer/)).not.toBeInTheDocument();
    expect(onAssign).not.toHaveBeenCalled();
  });

  it("takes the keyboard to the first table that fits from « Choisir une table → »", async () => {
    const { utilisateur } = await choisirRakoto();
    await utilisateur.click(screen.getByRole("button", { name: "Choisir une table pour Famille Rakoto" }));
    expect(carteDeTable("Collègues").getByRole("button", { name: /placer ici/i })).toHaveFocus();
  });
});

describe("PlanDeTableBureau focus after the server answers", () => {
  it("follows a seated household to its row in the table", async () => {
    const vue = rendre();
    await vue.utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    await vue.utilisateur.click(carteDeTable("Collègues").getByRole("button", { name: /placer ici/i }));

    vue.rerender(
      <PlanDeTableBureau
        {...props({ ...rappelsDe(vue), tables: [table({ households: [assis(), { ...rakoto }] }), TABLES[1]], aPlacer: [] })}
      />,
    );

    expect(carteDeTable("Collègues").getByRole("button", { name: /retirer famille rakoto/i })).toHaveFocus();
  });

  // Refusé : le plan revient identique. Le focus est déjà sur le foyer, il y reste.
  it("leaves the focus on the household when the placement was refused", async () => {
    const vue = rendre();
    await vue.utilisateur.click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    await vue.utilisateur.click(carteDeTable("Collègues").getByRole("button", { name: /placer ici/i }));
    vue.rerender(<PlanDeTableBureau {...props({ ...rappelsDe(vue), tables: [...TABLES], aPlacer: [{ ...rakoto }] })} />);
    expect(screen.getByRole("button", { name: "Placer Famille Rakoto" })).toHaveFocus();
  });

  it("follows a removed household back to « À placer »", async () => {
    const vue = rendre({ aPlacer: [] });
    await vue.utilisateur.click(carteDeTable("Collègues").getByRole("button", { name: /retirer famille martin/i }));
    expect(vue.onUnassign).toHaveBeenCalledWith("m");

    vue.rerender(
      <PlanDeTableBureau {...props({ ...rappelsDe(vue), tables: [table(), TABLES[1]], aPlacer: [{ ...assis(), status: "CONFIRMED" }] })} />,
    );
    expect(screen.getByRole("button", { name: "Placer Famille Martin" })).toHaveFocus();
  });

  // Un foyer décliné retiré de sa table n'apparaît pas dans « À placer » : le
  // focus se pose sur la table qu'il a quittée, pas sur `<body>`.
  it("lands on the table it left when the removed household has no card to go to", async () => {
    const decline = assis({ id: "d", displayName: "Famille Rabe", status: "DECLINED", confirmedCount: 0 });
    const vue = rendre({ tables: [table({ households: [decline] }), TABLES[1]], aPlacer: [] });
    await vue.utilisateur.click(carteDeTable("Collègues").getByRole("button", { name: /retirer famille rabe/i }));

    vue.rerender(<PlanDeTableBureau {...props({ ...rappelsDe(vue), tables: [table(), TABLES[1]], aPlacer: [] })} />);
    expect(screen.getByRole("heading", { name: "Collègues" })).toHaveFocus();
  });
});

describe("PlanDeTableBureau new table", () => {
  it("opens a draft named after the next table, ten seats by default", async () => {
    const { utilisateur } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    const formulaire = within(screen.getByRole("form", { name: "Nouvelle table" }));
    expect(formulaire.getByLabelText("Nom")).toHaveValue("Table 3");
    expect(formulaire.getByLabelText("Capacité")).toHaveValue(10);
  });

  it("creates the table on « Terminé », then closes the draft", async () => {
    const { utilisateur, onCreateTable } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(onCreateTable).toHaveBeenCalledWith({ name: "Table 3", capacity: 10 });
    await waitFor(() => expect(screen.queryByRole("form", { name: "Nouvelle table" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Nouvelle table" })).toHaveFocus();
  });

  // Refusée : le brouillon reste, rien n'est perdu de ce qui a été tapé.
  it("keeps the draft when the server refuses", async () => {
    const { utilisateur } = rendre({ onCreateTable: vi.fn().mockResolvedValue(false) });
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Terminé" })).toBeEnabled());
    expect(screen.getByRole("form", { name: "Nouvelle table" })).toBeInTheDocument();
  });

  it("drops the draft on « Annuler » without creating anything", async () => {
    const { utilisateur, onCreateTable } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("form", { name: "Nouvelle table" })).not.toBeInTheDocument();
    expect(onCreateTable).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Nouvelle table" })).toHaveFocus();
  });
});

describe("PlanDeTableBureau table edit", () => {
  async function modifierColleges(partiel: Partial<PlanDeTableBureauProps> = {}) {
    const vue = rendre(partiel);
    await vue.utilisateur.click(screen.getByRole("button", { name: "Modifier la table « Collègues »" }));
    return { ...vue, formulaire: within(screen.getByRole("form", { name: "Modifier la table « Collègues »" })) };
  }

  it("opens the table's form in place, prefilled", async () => {
    const { formulaire } = await modifierColleges();
    expect(formulaire.getByLabelText("Nom")).toHaveValue("Collègues");
    expect(formulaire.getByLabelText("Capacité")).toHaveValue(8);
    expect(screen.queryByRole("region", { name: "Collègues" })).not.toBeInTheDocument();
  });

  // 3 places occupées : la capacité ne descend pas sous 3.
  it("will not take the capacity under the seats taken", async () => {
    const { formulaire, utilisateur } = await modifierColleges();
    await utilisateur.clear(formulaire.getByLabelText("Capacité"));
    await utilisateur.type(formulaire.getByLabelText("Capacité"), "2");
    expect(formulaire.getByRole("alert")).toHaveTextContent("Au moins 3 places : déjà occupées.");
  });

  it("saves the change and gives the focus back to the table", async () => {
    const { formulaire, utilisateur, onUpdateTable } = await modifierColleges();
    await utilisateur.click(formulaire.getByRole("button", { name: "Ajouter une place" }));
    await utilisateur.click(formulaire.getByRole("button", { name: "Terminé" }));
    expect(onUpdateTable).toHaveBeenCalledWith("t1", { name: "Collègues", capacity: 9 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Modifier la table « Collègues »" })).toHaveFocus());
  });

  it("asks the page to delete the table from « Supprimer »", async () => {
    const { formulaire, utilisateur, onDeleteTable } = await modifierColleges();
    await utilisateur.click(formulaire.getByRole("button", { name: "Supprimer" }));
    expect(onDeleteTable).toHaveBeenCalledWith(TABLES[0]);
  });

  it("closes on Escape and gives the focus back to the table", async () => {
    const { utilisateur } = await modifierColleges();
    await utilisateur.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Modifier la table « Collègues »" })).toHaveFocus();
  });

  // La table a été supprimée : son formulaire disparaît avec elle, et le focus
  // va à un repère qui existe encore.
  it("lands on « Nouvelle table » once the table being edited is gone", async () => {
    const vue = await modifierColleges();
    vue.rerender(<PlanDeTableBureau {...props({ ...rappelsDe(vue), tables: [TABLES[1]] })} />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouvelle table" })).toHaveFocus();
  });
});
