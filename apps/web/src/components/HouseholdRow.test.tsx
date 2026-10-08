import type { HouseholdAdminDto } from "@invitation-app/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HouseholdActionsCell, HouseholdNameCell } from "./HouseholdRow";

function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
    id: "aZ3k9Lm2",
    displayName: "Famille Andriambelo",
    allocatedSeats: 3,
    memberNames: ["Lova Andriambelo", "Haja Andriambelo", "Toky Andriambelo"],
    status: "CONFIRMED",
    confirmedCount: 3,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...partiel,
  };
}

describe("HouseholdNameCell", () => {
  it("writes the household name in bold", () => {
    render(<HouseholdNameCell household={foyer()} showMembers={false} />);
    expect(screen.getByText("Famille Andriambelo")).toHaveClass("font-semibold");
  });

  it("lists the members' full names under it when asked", () => {
    render(<HouseholdNameCell household={foyer()} showMembers />);
    expect(screen.getByText("Lova Andriambelo, Haja Andriambelo, Toky Andriambelo")).toBeInTheDocument();
  });

  it("keeps the members hidden when the switch is off", () => {
    render(<HouseholdNameCell household={foyer()} showMembers={false} />);
    expect(screen.getByText("Famille Andriambelo")).toBeInTheDocument();
    expect(screen.queryByText(/Lova Andriambelo/)).toBeNull();
  });

  // Les prénoms sont facultatifs : un foyer sans membre n'a rien sous son nom,
  // pas une ligne vide.
  it("adds nothing under a household without members", () => {
    const { container } = render(<HouseholdNameCell household={foyer({ memberNames: [] })} showMembers />);
    expect(screen.getByText("Famille Andriambelo")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("HouseholdActionsCell", () => {
  function rendre() {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<HouseholdActionsCell household={foyer()} onEdit={onEdit} onDelete={onDelete} />);
    return { onEdit, onDelete, utilisateur: userEvent.setup() };
  }

  it("offers the copy gesture, named after the household", () => {
    rendre();
    expect(screen.getByRole("button", { name: /Copier le lien de Famille Andriambelo/ })).toBeInTheDocument();
  });

  it("names its « … » menu after the household", () => {
    rendre();
    expect(screen.getByRole("button", { name: "Actions pour Famille Andriambelo" })).toBeInTheDocument();
  });

  it("edits the household from the menu", async () => {
    const { onEdit, onDelete, utilisateur } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Andriambelo" }));
    await utilisateur.click(screen.getByRole("menuitem", { name: "Modifier" }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "aZ3k9Lm2" })));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("asks to delete the household from the menu, in the danger colour", async () => {
    const { onEdit, onDelete, utilisateur } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Andriambelo" }));
    const supprimer = screen.getByRole("menuitem", { name: "Supprimer" });
    expect(supprimer).toHaveClass("text-danger");
    await utilisateur.click(supprimer);
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "aZ3k9Lm2" })));
    expect(onEdit).not.toHaveBeenCalled();
  });
});
