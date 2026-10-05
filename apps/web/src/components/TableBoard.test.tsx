import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { TableBoard, dragEndTarget } from "./TableBoard";

/**
 * Le plateau rend **soit** la grille de bureau **soit** la liste du téléphone.
 * jsdom n'a pas de `matchMedia` : sans ce réglage, `useMediaQuery` répond
 * « non » et chaque test serait un test de téléphone sans le dire.
 */
const matchMediaOriginal = window.matchMedia;
function ecran(bureau: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: bureau,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function dragEvent(overId: string | null): DragEndEvent {
  return {
    active: { id: "h1" },
    over: overId === null ? null : { id: overId },
  } as DragEndEvent;
}

function foyer(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return {
    id: "h1",
    displayName: "Famille A",
    allocatedSeats: 4,
    confirmedCount: 4,
    status: "CONFIRMED",
    ...partiel,
  };
}

function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t1", name: "Table 1", capacity: 10, households: [], ...partiel };
}

function renderBoard({
  tables = [table({ households: [foyer()] })],
  unassigned = [] as TableHouseholdSummaryDto[],
  bureau = true,
  onAssign = vi.fn(),
  onUnassign = vi.fn(),
} = {}) {
  ecran(bureau);
  render(
    <TableBoard
      tables={tables}
      unassignedHouseholds={unassigned}
      onAssign={onAssign}
      onUnassign={onUnassign}
    />,
  );
  return { onAssign, onUnassign };
}

function chip(nom: string) {
  return within(screen.getByRole("group", { name: nom }));
}

afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe("TableBoard occupancy", () => {
  it("shows the seats taken over the capacity", () => {
    renderBoard();
    expect(screen.getByText(/4 \/ 10/)).toBeInTheDocument();
  });

  // `seatsFor` : un foyer sans réponse occupe son allocation entière. Une copie
  // locale qui compterait `confirmedCount ?? 0` afficherait « 0 / 10 ».
  it("counts a household that has not answered at its full allocation", () => {
    renderBoard({
      tables: [table({ households: [foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 3 })] })],
    });
    expect(screen.getByText(/3 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText("7 places restantes")).toBeInTheDocument();
  });

  // Le dépassement se dit en mots, pas par la seule couleur du titre.
  it("says in words when a table is over capacity", () => {
    renderBoard({ tables: [table({ capacity: 3, households: [foyer()] })] });
    expect(screen.getByText(/dépassement/i)).toBeInTheDocument();
  });
});

describe("TableBoard placement menu", () => {
  const tables = [
    table({ id: "t1", name: "Table 1", capacity: 10, households: [foyer({ id: "x", displayName: "Famille X", confirmedCount: 7, allocatedSeats: 7 })] }),
    table({ id: "t2", name: "Table 2", capacity: 4, households: [foyer({ id: "y", displayName: "Famille Y" })] }),
    table({ id: "t3", name: "Table 3", capacity: 8, households: [] }),
  ];
  const nouveau = foyer({ id: "n", displayName: "Rakotomavo", status: "PENDING", confirmedCount: null, allocatedSeats: 4 });

  async function ouvrirLeMenu() {
    const utilisateur = userEvent.setup();
    const rappels = renderBoard({ tables, unassigned: [nouveau] });
    await utilisateur.click(chip("Rakotomavo").getByRole("button", { name: "Placer à la table…" }));
    return { utilisateur, ...rappels, dialogue: within(screen.getByRole("dialog", { name: /placer rakotomavo/i })) };
  }

  it("lists every table with its remaining seats", async () => {
    const { dialogue } = await ouvrirLeMenu();
    expect(dialogue.getByRole("button", { name: /table 3.*8 places restantes/i })).toBeEnabled();
  });

  // Grisée, et dite pleine en texte : la couleur seule ne dit rien.
  it("disables a full table and says it is full", async () => {
    const { dialogue } = await ouvrirLeMenu();
    expect(dialogue.getByRole("button", { name: /table 2.*complète/i })).toBeDisabled();
  });

  // 3 places restantes, 4 à placer : la table n'est pas pleine, mais le foyer
  // n'y tient pas.
  it("disables a table the household does not fit in, and says why", async () => {
    const { dialogue } = await ouvrirLeMenu();
    const option = dialogue.getByRole("button", { name: /table 1/i });
    expect(option).toBeDisabled();
    expect(option).toHaveTextContent(/3 places restantes/);
    expect(option).toHaveTextContent(/trop petite/i);
  });

  it("seats the household at the chosen table and closes", async () => {
    const { utilisateur, dialogue, onAssign } = await ouvrirLeMenu();
    await utilisateur.click(dialogue.getByRole("button", { name: /table 3/i }));
    expect(onAssign).toHaveBeenCalledWith("t3", "n");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers a seated household every other table, not its own", async () => {
    const utilisateur = userEvent.setup();
    renderBoard({ tables });
    await utilisateur.click(chip("Famille Y").getByRole("button", { name: "Déplacer vers…" }));
    const dialogue = within(screen.getByRole("dialog", { name: /déplacer famille y/i }));
    expect(dialogue.getByRole("button", { name: /table 3/i })).toBeEnabled();
    expect(dialogue.queryByRole("button", { name: /table 2/i })).not.toBeInTheDocument();
  });

  it("removes a seated household from its table", async () => {
    const utilisateur = userEvent.setup();
    const { onUnassign } = renderBoard({ tables });
    await utilisateur.click(chip("Famille Y").getByRole("button", { name: "Retirer" }));
    expect(onUnassign).toHaveBeenCalledWith("y");
  });
});

describe("TableBoard layouts", () => {
  it("offers dragging on desktop, in addition to the menu", () => {
    renderBoard({ bureau: true });
    expect(screen.getByTestId("poignee-de-glisser")).toBeInTheDocument();
    expect(chip("Famille A").getByRole("button", { name: "Déplacer vers…" })).toBeInTheDocument();
  });

  // Au doigt, le glisser est inutilisable : pas de poignée, seulement le menu.
  it("offers no dragging on a phone", () => {
    renderBoard({ bureau: false, unassigned: [foyer({ id: "n", displayName: "Rakotomavo" })] });
    expect(screen.getByRole("group", { name: "Rakotomavo" })).toBeInTheDocument();
    expect(screen.queryByTestId("poignee-de-glisser")).not.toBeInTheDocument();
  });

  it("lists the unplaced households first on a phone, then each table folded", async () => {
    const utilisateur = userEvent.setup();
    renderBoard({ bureau: false, unassigned: [foyer({ id: "n", displayName: "Rakotomavo" })] });

    const sections = screen.getAllByRole("heading", { level: 2 });
    expect(sections[0]).toHaveTextContent(/non placés/i);

    const depli = screen.getByRole("button", { name: /table 1/i });
    expect(depli).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Famille A" })).not.toBeInTheDocument();

    await utilisateur.click(depli);
    expect(depli).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Famille A" })).toBeInTheDocument();
  });

  it("says so when every household is seated", () => {
    renderBoard({ unassigned: [] });
    expect(screen.getByText("Tous les foyers sont placés.")).toBeInTheDocument();
  });
});

describe("dragEndTarget", () => {
  it("does nothing when the drag was cancelled or released over dead space", () => {
    expect(dragEndTarget(dragEvent(null))).toBeNull();
  });

  it("unassigns only on an explicit drop on the unassigned zone", () => {
    expect(dragEndTarget(dragEvent("unassigned"))).toEqual({
      householdId: "h1",
      tableId: null,
    });
  });

  it("assigns to the table that was dropped on", () => {
    expect(dragEndTarget(dragEvent("t1"))).toEqual({ householdId: "h1", tableId: "t1" });
  });
});
