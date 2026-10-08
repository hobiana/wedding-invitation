import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HouseholdToolbar, type HouseholdToolbarProps } from "./HouseholdToolbar";

function rendre(props: Partial<HouseholdToolbarProps> = {}) {
  const rappels = {
    onRechercheChange: vi.fn(),
    onStatutChange: vi.fn(),
    onTriChange: vi.fn(),
    onSensToggle: vi.fn(),
    onMembresChange: vi.fn(),
    onLimitChange: vi.fn(),
  };
  render(
    <HouseholdToolbar
      variant="desktop"
      recherche=""
      statut="ALL"
      tri="name"
      sens="asc"
      membres
      limit={25}
      {...rappels}
      {...props}
    />,
  );
  return { ...rappels, utilisateur: userEvent.setup() };
}

describe("HouseholdToolbar — commun", () => {
  for (const variant of ["desktop", "mobile"] as const) {
    describe(variant, () => {
      // Pas de libellé visible sur la maquette : le nom accessible est porté
      // par `aria-label`, l'exemple par le placeholder.
      it("has a rounded search field with an accessible name", async () => {
        const { onRechercheChange, utilisateur } = rendre({ variant });
        const champ = screen.getByRole("searchbox", { name: "Rechercher un foyer" });
        expect(champ).toHaveAttribute("placeholder", "Nom du foyer ou d'un invité");
        expect(champ).toHaveClass("rounded-field");
        await utilisateur.type(champ, "a");
        expect(onRechercheChange).toHaveBeenCalledWith("a");
      });

      it("filters by status with pills, the active one pressed", async () => {
        const { onStatutChange, utilisateur } = rendre({ variant, statut: "PENDING" });
        const groupe = screen.getByRole("group", { name: "Filtrer par statut" });
        const pastilles = within(groupe).getAllByRole("button");
        expect(pastilles.map((p) => p.textContent)).toEqual(["Tous", "En attente", "Confirmés", "Déclinés"]);
        expect(within(groupe).getByRole("button", { name: "En attente" })).toHaveAttribute("aria-pressed", "true");
        await utilisateur.click(within(groupe).getByRole("button", { name: "Confirmés" }));
        expect(onStatutChange).toHaveBeenCalledWith("CONFIRMED");
      });

      it("shows or hides the members with a switch", async () => {
        const { onMembresChange, utilisateur } = rendre({ variant });
        const interrupteur = screen.getByRole("switch", { name: "Afficher les membres" });
        expect(interrupteur).toHaveAttribute("aria-checked", "true");
        await utilisateur.click(interrupteur);
        expect(onMembresChange).toHaveBeenCalledWith(false);
      });
    });
  }
});

describe("HouseholdToolbar — bureau", () => {
  it("offers the four sort keys in French, behind a visible label", async () => {
    const { onTriChange, utilisateur } = rendre();
    const tri = screen.getByLabelText("Trier par") as HTMLSelectElement;
    expect(tri).toHaveValue("name");
    expect(Array.from(tri.options).map((o) => [o.value, o.text])).toEqual([
      ["name", "Nom du foyer"],
      ["seats", "Places"],
      ["status", "Statut"],
      ["createdAt", "Date d'ajout"],
    ]);
    await utilisateur.selectOptions(tri, "seats");
    expect(onTriChange).toHaveBeenCalledWith("seats");
  });

  // Le sens se lit en toutes lettres, pas à la seule flèche ; le nom
  // accessible contient le libellé visible (WCAG 2.5.3).
  it("says the order in words and flips it", async () => {
    const { onSensToggle, utilisateur } = rendre({ sens: "desc" });
    const sens = screen.getByRole("button", { name: "Sens du tri : Décroissant" });
    expect(sens).toHaveTextContent("Décroissant");
    await utilisateur.click(sens);
    expect(onSensToggle).toHaveBeenCalledTimes(1);
  });

  it("leaves the page size to the table's footer, and has no sort sheet", () => {
    rendre();
    expect(screen.getByLabelText("Trier par")).toBeInTheDocument();
    expect(screen.queryByLabelText("Par page")).toBeNull();
    expect(screen.queryByRole("button", { name: "Trier" })).toBeNull();
  });
});

describe("HouseholdToolbar — téléphone", () => {
  it("puts the page size next to the switch", async () => {
    const { onLimitChange, utilisateur } = rendre({ variant: "mobile", limit: 10 });
    const taille = screen.getByLabelText("Par page");
    expect(taille).toHaveValue("10");
    await utilisateur.selectOptions(taille, "50");
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it("keeps the sort in a sheet, opened by « Trier »", async () => {
    const { utilisateur } = rendre({ variant: "mobile" });
    expect(screen.queryByLabelText("Trier par")).toBeNull();
    await utilisateur.click(screen.getByRole("button", { name: "Trier" }));
    const feuille = screen.getByRole("dialog", { name: "Trier" });
    expect(within(feuille).getByLabelText("Trier par")).toHaveValue("name");
    expect(within(feuille).getByRole("button", { name: "Sens du tri : Croissant" })).toBeInTheDocument();
  });

  it("sorts and flips from the sheet", async () => {
    const { onTriChange, onSensToggle, utilisateur } = rendre({ variant: "mobile" });
    await utilisateur.click(screen.getByRole("button", { name: "Trier" }));
    const feuille = screen.getByRole("dialog", { name: "Trier" });
    await utilisateur.selectOptions(within(feuille).getByLabelText("Trier par"), "createdAt");
    expect(onTriChange).toHaveBeenCalledWith("createdAt");
    await utilisateur.click(within(feuille).getByRole("button", { name: /Sens du tri/ }));
    expect(onSensToggle).toHaveBeenCalledTimes(1);
  });

  // La feuille n'a pas de <Trigger> Radix : c'est `BottomSheet` qui rend le
  // focus. On vérifie qu'il revient à « Trier », qui existe toujours.
  it("gives the focus back to « Trier » when the sheet closes", async () => {
    const { utilisateur } = rendre({ variant: "mobile" });
    const trier = screen.getByRole("button", { name: "Trier" });
    await utilisateur.click(trier);
    await screen.findByRole("dialog", { name: "Trier" });
    await utilisateur.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trier).toHaveFocus());
  });

  it("offers 40 px targets to the thumb", () => {
    rendre({ variant: "mobile" });
    expect(screen.getByRole("button", { name: "Trier" })).toHaveClass("h-10");
    expect(screen.getByRole("searchbox", { name: "Rechercher un foyer" })).toHaveClass("h-12");
  });
});
