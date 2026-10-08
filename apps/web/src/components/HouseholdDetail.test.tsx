import type { HouseholdAdminDto } from "@invitation-app/shared";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HouseholdDetail } from "./HouseholdDetail";

function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
    id: "aZ3k9Lm2",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: ["Fara Rakotomavo", "Naina Rakotomavo"],
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
  it("shows the members as pills, by full name", () => {
    render(<HouseholdDetail household={foyer()} />);
    const membres = screen.getByRole("list", { name: "Membres de Rakotomavo" });
    expect(within(membres).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "FFara Rakotomavo",
      "NNaina Rakotomavo",
    ]);
  });

  it("puts the seats next to the members", () => {
    render(<HouseholdDetail household={foyer({ confirmedCount: 3 })} />);
    expect(screen.getByText("3 / 4 places")).toBeInTheDocument();
  });

  // Un foyer qui n'a pas répondu n'a pas « 0 » personne : il n'a rien dit.
  it("writes a dash, never 0, for a household that has not answered", () => {
    render(<HouseholdDetail household={foyer({ status: "PENDING", confirmedCount: null })} />);
    expect(screen.getByText("— / 4 places")).toBeInTheDocument();
    expect(screen.queryByText(/^0 \//)).toBeNull();
  });

  it("shows the dietary notes and the guest's message", () => {
    render(<HouseholdDetail household={foyer()} />);
    expect(screen.getByText("Régime alimentaire")).toBeInTheDocument();
    expect(screen.getByText("sans arachide")).toBeInTheDocument();
    expect(screen.getByText("Merci, on a hâte !")).toBeInTheDocument();
  });

  it("shows the link in full, next to the gestures that copy and share it", () => {
    render(<HouseholdDetail household={foyer()} />);
    expect(screen.getByText("Lien d'invitation")).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/i/aZ3k9Lm2`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ })).toBeInTheDocument();
  });

  // Sur la carte du téléphone, « Copier le lien » et « Partager » sont déjà
  // sous le panneau : les répéter dedans donnerait deux fois le même bouton.
  it("leaves the gestures out when the caller already carries them", () => {
    render(<HouseholdDetail household={foyer()} withLinkActions={false} />);
    expect(screen.getByText(`${window.location.origin}/i/aZ3k9Lm2`)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("leaves the seats out when the card header already shows them", () => {
    render(<HouseholdDetail household={foyer({ confirmedCount: 3 })} withSeats={false} />);
    expect(screen.getByRole("list", { name: "Membres de Rakotomavo" })).toBeInTheDocument();
    expect(screen.queryByText("3 / 4 places")).toBeNull();
  });

  // Un foyer sans réponse n'a ni régime ni message : une étiquette suivie d'un
  // blanc se lit comme une donnée perdue.
  it("drops the empty sections instead of printing a dash", () => {
    render(
      <HouseholdDetail household={foyer({ dietaryNotes: null, message: null, memberNames: [] })} />,
    );
    // Le lien, lui, est toujours là : la preuve que le panneau s'est rendu.
    expect(screen.getByText("Lien d'invitation")).toBeInTheDocument();
    expect(screen.queryByText("Régime alimentaire")).toBeNull();
    expect(screen.queryByText("Message du foyer")).toBeNull();
    expect(screen.queryByText("Membres")).toBeNull();
  });

  // Le doré ornemental (`gold`) ne porte jamais de texte : les étiquettes
  // prennent l'or foncé, et le panneau le crème de la maquette.
  it("is a cream panel whose labels are in the dark gold", () => {
    const { container } = render(<HouseholdDetail household={foyer()} />);
    expect(container.firstChild).toHaveClass("bg-cream", "rounded-card");
    expect(screen.getByText("Régime alimentaire")).toHaveClass("text-gold-ink");
    expect(screen.getByText("Régime alimentaire").className).not.toMatch(/\btext-gold(?![\w-])/);
  });
});
