import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { HouseholdCard, type FoyerAPlacer } from "./HouseholdCard";

function foyer(partiel: Partial<FoyerAPlacer> = {}): FoyerAPlacer {
  return { id: "r", displayName: "Famille Rakoto", allocatedSeats: 5, confirmedCount: 5, status: "CONFIRMED", ...partiel };
}

describe("HouseholdCard", () => {
  it("shows the name and the seats of a household that answered", () => {
    render(<HouseholdCard foyer={foyer()} onPlacer={vi.fn()} />);
    const carte = within(screen.getByRole("group", { name: "Famille Rakoto" }));
    expect(carte.getByText("5 places")).toBeInTheDocument();
    expect(carte.queryByText(/en attente/)).not.toBeInTheDocument();
  });

  // Invariant : sans réponse, le foyer compte pour toute son allocation.
  it("counts a household that has not answered at its full allocation, and says it is waiting", () => {
    render(<HouseholdCard foyer={foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 1 })} onPlacer={vi.fn()} />);
    expect(screen.getByText("1 place · en attente de réponse")).toBeInTheDocument();
  });

  it("asks to place the household, naming it for a screen reader", async () => {
    const onPlacer = vi.fn();
    render(<HouseholdCard foyer={foyer()} onPlacer={onPlacer} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Placer Famille Rakoto" }));
    expect(onPlacer).toHaveBeenCalledOnce();
  });

  it("invites to choose a table once selected", () => {
    render(<HouseholdCard foyer={foyer()} onPlacer={vi.fn()} selectionne />);
    const bouton = screen.getByRole("button", { name: "Choisir une table pour Famille Rakoto" });
    expect(bouton).toHaveTextContent("Choisir une table →");
  });

  // La maquette du téléphone : « Placer › », et « en attente » sans « de réponse ».
  it("reads « Placer › » on a phone, the chevron kept out of its name", () => {
    render(
      <HouseholdCard foyer={foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 1 })} onPlacer={vi.fn()} telephone />,
    );
    const bouton = screen.getByRole("button", { name: "Placer Famille Rakoto" });
    expect(bouton).toHaveTextContent("Placer ›");
    expect(screen.getByText("1 place · en attente")).toBeInTheDocument();
  });

  it("can be dragged on a desktop, keeping its button", () => {
    render(
      <DndContext>
        <HouseholdCard foyer={foyer()} onPlacer={vi.fn()} glissable />
      </DndContext>,
    );
    const carte = screen.getByRole("group", { name: "Famille Rakoto" });
    expect(carte).toHaveAttribute("data-glissable", "true");
    expect(within(carte).getByRole("button", { name: "Placer Famille Rakoto" })).toBeInTheDocument();
  });

  // Le fantôme sous la souris est une image : rien à y focaliser, rien à lire
  // deux fois.
  it("renders the drag ghost hidden from assistive technology, without a button", () => {
    const { container } = render(<HouseholdCard foyer={foyer()} onPlacer={vi.fn()} fantome />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("[data-household-id]")).toBeNull();
  });
});
