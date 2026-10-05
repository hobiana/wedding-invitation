import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DndContext } from "@dnd-kit/core";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { TableCard, type TableCardProps } from "./TableCard";

function foyer(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "m", displayName: "Famille Martin", allocatedSeats: 3, confirmedCount: 3, status: "CONFIRMED", ...partiel };
}
function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t1", name: "Table d'honneur", capacity: 8, households: [], ...partiel };
}
function rendre(props: Partial<TableCardProps> = {}) {
  const onRetirer = vi.fn();
  render(<TableCard table={table()} onRetirer={onRetirer} {...props} />);
  return { onRetirer, carte: within(screen.getByRole("region", { name: props.table?.name ?? "Table d'honneur" })) };
}

describe("TableCard occupancy", () => {
  // Invariant : un foyer sans réponse occupe toute son allocation, jamais 0.
  it("counts a household that has not answered at its full allocation", () => {
    const { carte } = rendre({
      table: table({ households: [foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 5 })] }),
    });
    expect(carte.getByText("5 / 8")).toBeInTheDocument();
    expect(carte.getByText("3 places libres")).toBeInTheDocument();
  });

  it("agrees a single free seat", () => {
    const { carte } = rendre({ table: table({ capacity: 4, households: [foyer()] }) });
    expect(carte.getByText("1 place libre")).toBeInTheDocument();
  });

  // Le dépassement se dit en mots, pas par la seule couleur de la barre.
  it("says in words when a table is over capacity", () => {
    const { carte } = rendre({ table: table({ capacity: 2, households: [foyer()] }) });
    expect(carte.getByText("Dépassement de 1 place")).toBeInTheDocument();
  });

  it("says a table is full", () => {
    const { carte } = rendre({ table: table({ capacity: 3, households: [foyer()] }) });
    expect(carte.getByText("Complète")).toBeInTheDocument();
  });

  it("says an empty table is free", () => {
    const { carte } = rendre();
    expect(carte.getByText("Table libre")).toBeInTheDocument();
  });
});

describe("TableCard households", () => {
  it("marks a household that has not answered, in words", () => {
    const { carte } = rendre({
      table: table({ households: [foyer({ status: "PENDING", confirmedCount: null })] }),
    });
    expect(within(carte.getByRole("listitem")).getByText("en attente")).toBeInTheDocument();
  });

  // Beside the name, the badge left a long name like « Famille Rakotomalala »
  // about 100px and it broke mid-word in a 240px card (« Rakotomalal / a »).
  // Under the name, the name keeps the whole row. jsdom measures nothing: this
  // locks the structure, Chrome says whether it holds.
  it("puts the status badge under the name, so the name keeps the row's width", () => {
    const { carte } = rendre({
      table: table({
        households: [foyer({ displayName: "Famille Rakotomalala", status: "PENDING", confirmedCount: null })],
      }),
    });
    const ligne = carte.getByRole("listitem");
    const nom = within(ligne).getByText("Famille Rakotomalala");
    const badge = within(ligne).getByText("en attente");
    expect(nom.parentElement).toBe(badge.parentElement);
    expect(nom.parentElement).not.toBe(ligne);
  });

  it("removes a household with the ×, named for a screen reader", async () => {
    const assis = foyer();
    const { onRetirer, carte } = rendre({ table: table({ households: [assis] }) });
    await userEvent.setup().click(
      carte.getByRole("button", { name: "Retirer Famille Martin de la table « Table d'honneur »" }),
    );
    expect(onRetirer).toHaveBeenCalledWith(assis);
  });
});

describe("TableCard footer", () => {
  it("offers to edit the table", async () => {
    const onModifier = vi.fn();
    const { carte } = rendre({ onModifier });
    await userEvent.setup().click(carte.getByRole("button", { name: "Modifier la table « Table d'honneur »" }));
    expect(onModifier).toHaveBeenCalledOnce();
  });

  it("offers to place the chosen household here when it fits", async () => {
    const onPlacerIci = vi.fn();
    const { carte } = rendre({ etat: "accueille", onPlacerIci });
    await userEvent.setup().click(carte.getByRole("button", { name: "Placer ici, à la table « Table d'honneur »" }));
    expect(onPlacerIci).toHaveBeenCalledOnce();
    expect(carte.queryByRole("button", { name: /modifier/i })).not.toBeInTheDocument();
  });

  // Estompée, et dite trop petite : la teinte seule ne dit rien.
  it("says a table cannot take the household", () => {
    const { carte } = rendre({ etat: "trop-petite" });
    expect(carte.getByText("Pas assez de places")).toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveAttribute("data-etat", "trop-petite");
  });

  // Estomper toute la carte faisait tomber « Pas assez de places » vers 2,8:1 :
  // c'est le contenu qui pâlit, pas la phrase qui dit pourquoi.
  it("dims the table's content but keeps the reason at full contrast", () => {
    const { carte } = rendre({ etat: "trop-petite" });
    expect(carte.getByRole("heading", { name: "Table d'honneur" }).closest("[data-estompe]")).not.toBeNull();
    expect(carte.getByText("Pas assez de places").closest("[data-estompe]")).toBeNull();
    expect(screen.getByRole("region")).not.toHaveClass("opacity-60");
  });
});

describe("TableCard dragging", () => {
  it("lets the seated households be dragged on a desktop, keeping the ×", () => {
    render(
      <DndContext>
        <TableCard table={table({ households: [foyer()] })} onRetirer={vi.fn()} glissable />
      </DndContext>,
    );
    const ligne = screen.getByRole("listitem");
    expect(ligne).toHaveAttribute("data-glissable", "true");
    expect(within(ligne).getByRole("button", { name: /retirer famille martin/i })).toBeInTheDocument();
  });
});
