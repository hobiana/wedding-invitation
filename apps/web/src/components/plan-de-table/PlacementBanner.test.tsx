import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlacementBanner } from "./PlacementBanner";
import type { FoyerAPlacer } from "./HouseholdCard";

const rakoto: FoyerAPlacer = { id: "r", displayName: "Famille Rakoto", allocatedSeats: 5, confirmedCount: 5, status: "CONFIRMED" };

describe("PlacementBanner", () => {
  it("asks where to seat the household, with its seats", () => {
    render(<PlacementBanner foyer={rakoto} aucuneTable={false} onAnnuler={vi.fn()} />);
    expect(screen.getByText(/Où placer/)).toHaveTextContent(
      "Où placer Famille Rakoto ? (5 places) — choisissez une table en surbrillance.",
    );
  });

  it("says so when no table has room for it", () => {
    render(<PlacementBanner foyer={rakoto} aucuneTable onAnnuler={vi.fn()} />);
    expect(screen.getByText(/Aucune table/)).toHaveTextContent(
      "Aucune table n'a assez de places pour Famille Rakoto (5 places).",
    );
  });

  it("cancels", async () => {
    const onAnnuler = vi.fn();
    render(<PlacementBanner foyer={rakoto} aucuneTable={false} onAnnuler={onAnnuler} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Annuler" }));
    expect(onAnnuler).toHaveBeenCalledOnce();
  });

  // La région live existe avant de parler : sinon un lecteur d'écran ne
  // l'écoute pas encore quand la question y arrive.
  it("keeps its live region mounted once the question is gone", () => {
    const { rerender, container } = render(<PlacementBanner foyer={rakoto} aucuneTable={false} onAnnuler={vi.fn()} />);
    const region = container.querySelector("[aria-live='polite']");
    expect(region).toHaveTextContent(/Où placer/);
    rerender(<PlacementBanner foyer={null} aucuneTable={false} onAnnuler={vi.fn()} />);
    expect(container.querySelector("[aria-live='polite']")).toBe(region);
    expect(region).toBeEmptyDOMElement();
  });
});
