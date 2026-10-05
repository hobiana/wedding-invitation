import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { CarteDeTableRepliable } from "./CarteDeTableRepliable";

function assis(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "m", displayName: "Famille Martin", allocatedSeats: 3, confirmedCount: null, status: "PENDING", ...partiel };
}
function table(partiel: Partial<TableDto> = {}): TableDto {
  return {
    id: "honneur",
    name: "Table d'honneur",
    capacity: 8,
    households: [assis(), assis({ id: "c", displayName: "Claire & Hugo", allocatedSeats: 2, confirmedCount: 2, status: "CONFIRMED" })],
    ...partiel,
  };
}

function rendre(t: TableDto = table(), onEnregistrer = vi.fn().mockResolvedValue(true)) {
  const props = {
    onDeplacer: vi.fn(),
    onRetirer: vi.fn(),
    onEnregistrer,
    onSupprimer: vi.fn(),
  };
  render(<CarteDeTableRepliable table={t} {...props} />);
  return { ...props, utilisateur: userEvent.setup() };
}

const bascule = () => screen.getByRole("button", { name: /^Table d'honneur/ });

async function deplier(utilisateur: ReturnType<typeof userEvent.setup>) {
  await utilisateur.click(bascule());
}

describe("CarteDeTableRepliable — folded", () => {
  it("puts its toggle in a heading, with the seats taken out of the capacity", () => {
    rendre();
    const titre = screen.getByRole("heading", { level: 2 });
    expect(within(titre).getByRole("button")).toBe(bascule());
    expect(bascule()).toHaveAccessibleName("Table d'honneur, 5 sur 8 places");
    expect(bascule()).toHaveTextContent("5 / 8");
    expect(bascule()).toHaveAttribute("aria-expanded", "false");
  });

  it("says how many seats are left, and hides the households", () => {
    rendre();
    expect(screen.getByText("3 places libres")).toBeInTheDocument();
    expect(screen.queryByText("Famille Martin")).not.toBeInTheDocument();
  });

  it("says a full table is full", () => {
    rendre(table({ capacity: 5 }));
    expect(screen.getByText("Complète")).toBeInTheDocument();
  });

  it("says when a table is over capacity, in words", () => {
    rendre(table({ capacity: 4 }));
    expect(screen.getByText("Dépassement de 1 place")).toBeInTheDocument();
  });
});

describe("CarteDeTableRepliable — unfolded", () => {
  it("unfolds on a tap and lists each household with its seats", async () => {
    const { utilisateur } = rendre();
    await deplier(utilisateur);
    expect(bascule()).toHaveAttribute("aria-expanded", "true");
    const ligne = (nom: string) => within(screen.getByText(nom).closest("li") as HTMLElement);
    expect(ligne("Famille Martin").getByText("3 places · en attente")).toBeInTheDocument();
    expect(ligne("Claire & Hugo").getByText("2 places")).toBeInTheDocument();
  });

  it("folds back on a second tap", async () => {
    const { utilisateur } = rendre();
    await deplier(utilisateur);
    await deplier(utilisateur);
    expect(bascule()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Famille Martin")).not.toBeInTheDocument();
  });

  it("moves a household from its row", async () => {
    const { utilisateur, onDeplacer } = rendre();
    await deplier(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: "Déplacer Famille Martin" }));
    expect(onDeplacer).toHaveBeenCalledWith(expect.objectContaining({ id: "m" }));
  });

  it("removes a household from its row, naming the table", async () => {
    const { utilisateur, onRetirer } = rendre();
    await deplier(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: "Retirer Claire & Hugo de la table « Table d'honneur »" }));
    expect(onRetirer).toHaveBeenCalledWith(expect.objectContaining({ id: "c" }));
  });

  it("says when a declined household is still seated", async () => {
    const { utilisateur } = rendre(table({ households: [assis({ status: "DECLINED", confirmedCount: 0 })] }));
    await deplier(utilisateur);
    expect(screen.getByText(/· a décliné$/)).toBeInTheDocument();
  });

  it("says an empty table is free", async () => {
    const { utilisateur } = rendre(table({ households: [] }));
    await deplier(utilisateur);
    expect(screen.getByText("Table libre")).toBeInTheDocument();
  });

  it("asks the page to delete the table", async () => {
    const { utilisateur, onSupprimer } = rendre();
    await deplier(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table « Table d'honneur »" }));
    expect(onSupprimer).toHaveBeenCalled();
  });
});

describe("CarteDeTableRepliable — capacity", () => {
  it("raises the capacity with the stepper and saves it on demand", async () => {
    const { utilisateur, onEnregistrer } = rendre();
    await deplier(utilisateur);
    const capacite = screen.getByRole("group", { name: "Capacité" });
    await utilisateur.click(within(capacite).getByRole("button", { name: "Ajouter une place" }));
    expect(within(capacite).getByText("9 places")).toBeInTheDocument();
    expect(onEnregistrer).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer la capacité" }));
    expect(onEnregistrer).toHaveBeenCalledWith({ name: "Table d'honneur", capacity: 9 });
  });

  it("sends nothing while the capacity is unchanged", async () => {
    const { utilisateur, onEnregistrer } = rendre();
    await deplier(utilisateur);
    const enregistrer = screen.getByRole("button", { name: "Enregistrer la capacité" });
    expect(enregistrer).toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(enregistrer);
    expect(onEnregistrer).not.toHaveBeenCalled();
  });

  // Le serveur refuserait de descendre sous l'occupation ; on le dit avant.
  it("will not go below the seats already taken, and says why", async () => {
    const { utilisateur } = rendre(table({ capacity: 6 }));
    await deplier(utilisateur);
    const capacite = within(screen.getByRole("group", { name: "Capacité" }));
    const retirer = capacite.getByRole("button", { name: "Retirer une place" });
    await utilisateur.click(retirer);
    expect(capacite.getByText("5 places")).toBeInTheDocument();
    expect(retirer).toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(retirer);
    expect(capacite.getByText("5 places")).toBeInTheDocument();
    expect(screen.getByText("Au moins 5 places : déjà occupées.")).toBeInTheDocument();
  });

  it("keeps the new value on screen when the save is refused", async () => {
    const { utilisateur } = rendre(table(), vi.fn().mockResolvedValue(false));
    await deplier(utilisateur);
    const capacite = within(screen.getByRole("group", { name: "Capacité" }));
    await utilisateur.click(capacite.getByRole("button", { name: "Ajouter une place" }));
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer la capacité" }));
    expect(capacite.getByText("9 places")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer la capacité" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("CarteDeTableRepliable — renaming", () => {
  it("renames the table through the table form, then closes it", async () => {
    const { utilisateur, onEnregistrer } = rendre();
    await deplier(utilisateur);
    await utilisateur.click(screen.getByRole("button", { name: "Renommer la table « Table d'honneur »" }));
    const nom = screen.getByLabelText("Nom");
    await utilisateur.clear(nom);
    await utilisateur.type(nom, "Les mariés");
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(onEnregistrer).toHaveBeenCalledWith({ name: "Les mariés", capacity: 8 });
    expect(await screen.findByRole("button", { name: /^Table d'honneur/ })).toHaveFocus();
    expect(screen.queryByLabelText("Nom")).not.toBeInTheDocument();
  });
});
