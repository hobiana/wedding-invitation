import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DndContext } from "@dnd-kit/core";
import type { TableHouseholdSummaryDto } from "@invitation-app/shared";
import { HouseholdChip } from "./HouseholdChip";

function foyer(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return {
    id: "h1",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    confirmedCount: null,
    status: "PENDING",
    ...partiel,
  };
}

function chip(nom = "Rakotomavo") {
  return within(screen.getByRole("group", { name: nom }));
}

describe("HouseholdChip", () => {
  // Un foyer sans réponse occupe toute son allocation (c'est `seatsFor`) :
  // afficher « 0 » lui prêterait un refus qu'il n'a pas donné.
  it("counts a household that has not answered at its full allocation, never zero", () => {
    render(<HouseholdChip household={foyer()} placed={false} onPlace={() => {}} />);
    expect(chip().getByText("4 places")).toBeInTheDocument();
    expect(chip().queryByText(/^0/)).not.toBeInTheDocument();
  });

  it("counts a confirmed household at what it confirmed", () => {
    render(
      <HouseholdChip
        household={foyer({ status: "CONFIRMED", confirmedCount: 3 })}
        placed={false}
        onPlace={() => {}}
      />,
    );
    expect(chip().getByText("3 places")).toBeInTheDocument();
  });

  it("agrees the noun for a single seat", () => {
    render(
      <HouseholdChip household={foyer({ allocatedSeats: 1 })} placed={false} onPlace={() => {}} />,
    );
    expect(chip().getByText("1 place")).toBeInTheDocument();
  });

  // Le statut porte un libellé, jamais la seule teinte.
  it("labels the answer status in words", () => {
    render(<HouseholdChip household={foyer()} placed={false} onPlace={() => {}} />);
    expect(chip().getByText("En attente")).toBeInTheDocument();
  });

  it("offers to seat an unplaced household, and nothing to remove", async () => {
    const utilisateur = userEvent.setup();
    const onPlace = vi.fn();
    render(<HouseholdChip household={foyer()} placed={false} onPlace={onPlace} />);

    await utilisateur.click(chip().getByRole("button", { name: "Placer à la table…" }));
    expect(onPlace).toHaveBeenCalledTimes(1);
    expect(chip().queryByRole("button", { name: "Retirer" })).not.toBeInTheDocument();
  });

  it("offers to move or remove a seated household", async () => {
    const utilisateur = userEvent.setup();
    const onPlace = vi.fn();
    const onRemove = vi.fn();
    render(<HouseholdChip household={foyer()} placed onPlace={onPlace} onRemove={onRemove} />);

    await utilisateur.click(chip().getByRole("button", { name: "Déplacer vers…" }));
    expect(onPlace).toHaveBeenCalledTimes(1);
    await utilisateur.click(chip().getByRole("button", { name: "Retirer" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // Sur téléphone, le glisser est inutilisable au doigt : pas de poignée du tout.
  it("shows no drag handle unless dragging is enabled", () => {
    render(<HouseholdChip household={foyer()} placed={false} onPlace={() => {}} />);
    expect(screen.queryByTestId("poignee-de-glisser")).not.toBeInTheDocument();
  });

  it("shows a drag handle on desktop, hidden from assistive technology", () => {
    render(
      <DndContext>
        <HouseholdChip household={foyer()} placed={false} onPlace={() => {}} draggable />
      </DndContext>,
    );
    const poignee = screen.getByTestId("poignee-de-glisser");
    expect(poignee).toHaveAttribute("aria-hidden", "true");
    expect(poignee).not.toHaveAttribute("tabindex", "0");
    // Les boutons restent là : le glisser s'ajoute au menu, il ne le remplace pas.
    expect(chip().getByRole("button", { name: "Placer à la table…" })).toBeInTheDocument();
  });
});
