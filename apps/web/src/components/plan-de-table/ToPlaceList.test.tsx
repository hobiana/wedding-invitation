import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { ToPlaceList, type ToPlaceListProps } from "./ToPlaceList";
import type { FoyerAPlacer } from "./HouseholdCard";

function foyer(partiel: Partial<FoyerAPlacer> = {}): FoyerAPlacer {
  return { id: "r", displayName: "Famille Rakoto", allocatedSeats: 5, confirmedCount: 5, status: "CONFIRMED", ...partiel };
}
const LISTE = [
  foyer(),
  foyer({ id: "i", displayName: "Inès & Paul", allocatedSeats: 2, confirmedCount: 2 }),
  foyer({ id: "g", displayName: "Famille Girard", memberNames: ["Raïssa", "Éloi"], allocatedSeats: 3, confirmedCount: null, status: "PENDING" }),
];

function rendre(props: Partial<ToPlaceListProps> = {}) {
  const onPlacer = vi.fn();
  render(<ToPlaceList foyers={LISTE} placesAPlacer={10} selectionId={null} onPlacer={onPlacer} {...props} />);
  return { onPlacer, utilisateur: userEvent.setup() };
}
const noms = () => screen.queryAllByRole("group").map((g) => g.getAttribute("aria-label"));

describe("ToPlaceList", () => {
  it("lists the households in the order given, with the seats left to place", () => {
    rendre();
    expect(noms()).toEqual(["Famille Rakoto", "Inès & Paul", "Famille Girard"]);
    expect(screen.getByText("10 places")).toBeInTheDocument();
  });

  it("agrees a single seat", () => {
    rendre({ foyers: [foyer({ allocatedSeats: 1, confirmedCount: 1 })], placesAPlacer: 1 });
    expect(screen.getByRole("heading", { name: "À placer" }).nextElementSibling).toHaveTextContent(/^1 place$/);
  });

  it("filters on the name without case or accents", async () => {
    const { utilisateur } = rendre();
    await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "INES");
    expect(noms()).toEqual(["Inès & Paul"]);
  });

  it("filters on a member's first name", async () => {
    const { utilisateur } = rendre();
    await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "eloi");
    expect(noms()).toEqual(["Famille Girard"]);
  });

  it("says when the search finds nothing", async () => {
    const { utilisateur } = rendre();
    await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "zzz");
    expect(screen.getByText("Aucun foyer ne correspond à « zzz ».")).toBeInTheDocument();
  });

  it("says when every household is seated", () => {
    rendre({ foyers: [], placesAPlacer: 0 });
    expect(screen.getByText("Tous les foyers sont placés.")).toBeInTheDocument();
  });

  it("hands the chosen household back", async () => {
    const { utilisateur, onPlacer } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Placer Inès & Paul" }));
    expect(onPlacer).toHaveBeenCalledWith(LISTE[1]);
  });

  it("shows which household is being placed", () => {
    rendre({ selectionId: "r" });
    expect(screen.getByRole("group", { name: "Famille Rakoto" })).toHaveAttribute("data-selectionne", "true");
    expect(within(screen.getByRole("group", { name: "Inès & Paul" })).getByRole("button")).toHaveTextContent("Placer");
  });

  it("makes the cards draggable on a desktop", () => {
    render(
      <DndContext>
        <ToPlaceList foyers={LISTE} placesAPlacer={10} selectionId={null} onPlacer={vi.fn()} glissable />
      </DndContext>,
    );
    expect(screen.getByRole("group", { name: "Famille Rakoto" })).toHaveAttribute("data-glissable", "true");
  });
});
