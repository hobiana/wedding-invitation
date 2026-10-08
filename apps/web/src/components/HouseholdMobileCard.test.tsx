import type { HouseholdAdminDto } from "@invitation-app/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseholdMobileCard, type HouseholdMobileCardProps } from "./HouseholdMobileCard";

function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
    id: "aZ3k9Lm2",
    displayName: "Famille Andriambelo",
    allocatedSeats: 3,
    memberNames: ["Lova Andriambelo", "Haja Andriambelo", "Toky Andriambelo"],
    status: "CONFIRMED",
    confirmedCount: 3,
    dietaryNotes: "Végétarien",
    message: null,
    tableId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...partiel,
  };
}

const partageOriginal = navigator.share;
afterEach(() => {
  Object.defineProperty(navigator, "share", { value: partageOriginal, configurable: true });
  vi.restoreAllMocks();
});

function rendre(props: Partial<HouseholdMobileCardProps> = {}) {
  const rappels = { onToggle: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(
    <HouseholdMobileCard household={foyer()} showMembers expanded={false} {...rappels} {...props} />,
  );
  return { ...rappels, utilisateur: userEvent.setup() };
}

/** L'en-tête de la carte : le seul bouton dont le nom commence par celui du foyer. */
const entete = () => screen.getByRole("button", { name: /^Famille Andriambelo/ });

describe("HouseholdMobileCard", () => {
  it("shows the name, the status in words, and the seats", () => {
    rendre();
    expect(entete()).toHaveTextContent("Famille Andriambelo");
    expect(within(entete()).getByText("Confirmé")).toBeInTheDocument();
    expect(entete()).toHaveTextContent("3 / 3 places");
  });

  it("writes a dash, never 0, for a household that has not answered", () => {
    rendre({ household: foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 4 }) });
    expect(entete()).toHaveTextContent("— / 4 places");
    expect(entete()).not.toHaveTextContent("0 / 4");
  });

  // « 1 / 1 places » est une faute en français : un seul siège reste au singulier.
  it("writes 'place' in the singular for a single seat", () => {
    rendre({ household: foyer({ status: "CONFIRMED", confirmedCount: 1, allocatedSeats: 1 }) });
    expect(entete()).toHaveTextContent("1 / 1 place");
    expect(entete()).not.toHaveTextContent("1 / 1 places");
  });

  it("adds the first names when the switch is on", () => {
    rendre();
    expect(within(entete()).getByText("Lova, Haja, Toky")).toBeInTheDocument();
  });

  it("leaves the first names out when the switch is off", () => {
    rendre({ showMembers: false });
    expect(entete()).toHaveTextContent("3 / 3 places");
    expect(screen.queryByText("Lova, Haja, Toky")).toBeNull();
  });

  // Sans membre, pas de « · » orphelin après les places.
  it("adds no separator for a household without members", () => {
    rendre({ household: foyer({ memberNames: [] }) });
    expect(entete()).toHaveTextContent("3 / 3 places");
    expect(entete()).not.toHaveTextContent("·");
  });

  // L'en-tête est un vrai bouton : tabulable, actionné à Entrée, et il dit
  // s'il est ouvert.
  it("unfolds from its header, which says whether it is open", async () => {
    const { onToggle, utilisateur } = rendre();
    expect(entete()).toHaveAttribute("aria-expanded", "false");
    await utilisateur.click(entete());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("can be unfolded from the keyboard", async () => {
    const { onToggle, utilisateur } = rendre();
    entete().focus();
    await utilisateur.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  describe("unfolded", () => {
    it("shows the cream panel in place, tied to its header", () => {
      rendre({ expanded: true });
      expect(entete()).toHaveAttribute("aria-expanded", "true");
      const panneau = document.getElementById(entete().getAttribute("aria-controls") ?? "");
      expect(panneau).not.toBeNull();
      expect(within(panneau as HTMLElement).getByRole("list", { name: "Membres de Famille Andriambelo" })).toBeInTheDocument();
      expect(within(panneau as HTMLElement).getByText("Végétarien")).toBeInTheDocument();
      expect(within(panneau as HTMLElement).getByText(`${window.location.origin}/i/aZ3k9Lm2`)).toBeInTheDocument();
    });

    // Les membres sont dans le panneau, en pastilles : les répéter dans
    // l'en-tête serait la même liste deux fois (maquette 17).
    it("drops the first names from the header, the panel lists them", () => {
      rendre({ expanded: true });
      expect(screen.queryByText("Lova, Haja, Toky")).toBeNull();
      expect(screen.getByText("Lova Andriambelo")).toBeInTheDocument();
    });

    // Le panneau ne répète pas les boutons que la carte porte juste dessous.
    it("keeps a single copy button", () => {
      rendre({ expanded: true });
      expect(screen.getAllByRole("button", { name: /Copier le lien de Famille Andriambelo/ })).toHaveLength(1);
    });

    it("marks its border more strongly", () => {
      rendre({ expanded: true });
      expect(screen.getByRole("article")).toHaveClass("border-rule-strong");
    });
  });

  it("is a rounded card", () => {
    rendre();
    expect(screen.getByRole("article", { name: "Famille Andriambelo" })).toHaveClass("rounded-card");
  });

  describe("actions", () => {
    it("offers a wide copy button of 40 px", () => {
      rendre();
      const copier = screen.getByRole("button", { name: /Copier le lien de Famille Andriambelo/ });
      expect(copier).toHaveClass("h-10", "w-full");
    });

    it("offers to share when the phone can", () => {
      Object.defineProperty(navigator, "share", { value: vi.fn(), configurable: true });
      rendre();
      expect(screen.getByRole("button", { name: /Partager le lien de Famille Andriambelo/ })).toHaveClass("h-10");
    });

    it("edits and deletes from the « … » menu", async () => {
      const { onEdit, onDelete, utilisateur } = rendre();
      const menu = screen.getByRole("button", { name: "Actions pour Famille Andriambelo" });
      await utilisateur.click(menu);
      await utilisateur.click(screen.getByRole("menuitem", { name: "Modifier" }));
      await waitFor(() => expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "aZ3k9Lm2" })));

      await utilisateur.click(menu);
      await utilisateur.click(screen.getByRole("menuitem", { name: "Supprimer" }));
      await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "aZ3k9Lm2" })));
    });
  });
});
