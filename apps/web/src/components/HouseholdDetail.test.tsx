import type { HouseholdAdminDto } from "@invitation-app/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HouseholdDetail } from "./HouseholdDetail";

function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
    id: "aZ3k9Lm2",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: ["Fara", "Naina"],
    status: "CONFIRMED",
    confirmedCount: 4,
    dietaryNotes: "sans arachide",
    message: "Merci, on a hâte !",
    tableId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-11-12T19:30:00.000Z",
    ...partiel,
  };
}

describe("HouseholdDetail", () => {
  it("shows what the row had no room for", () => {
    render(<HouseholdDetail household={foyer()} />);
    expect(screen.getByText("Fara, Naina")).toBeInTheDocument();
    expect(screen.getByText("sans arachide")).toBeInTheDocument();
    expect(screen.getByText("Merci, on a hâte !")).toBeInTheDocument();
  });

  it("shows the link in full, next to the gesture that copies it", () => {
    render(<HouseholdDetail household={foyer()} />);
    expect(screen.getByText(`${window.location.origin}/i/aZ3k9Lm2`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ })).toBeInTheDocument();
  });

  // Un foyer sans réponse n'a ni régime ni message : une étiquette suivie d'un
  // blanc se lit comme une donnée perdue.
  it("drops the empty lines instead of printing a dash", () => {
    render(
      <HouseholdDetail household={foyer({ dietaryNotes: null, message: null, memberNames: [] })} />,
    );
    expect(screen.queryByText("Régime alimentaire")).toBeNull();
    expect(screen.queryByText("Message du foyer")).toBeNull();
    expect(screen.queryByText("Membres")).toBeNull();
  });
});
