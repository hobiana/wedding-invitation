import { useState, type ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./bottom-sheet";

function rendre(props: Partial<ComponentProps<typeof BottomSheet>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <BottomSheet
      open
      onOpenChange={onOpenChange}
      eyebrow="Trier"
      title="Trier les foyers"
      description="Choisissez l'ordre de la liste."
      {...props}
    >
      <button type="button">Nom du foyer</button>
    </BottomSheet>,
  );
  return { onOpenChange, utilisateur: userEvent.setup() };
}

describe("BottomSheet", () => {
  it("est un dialogue nommé par son titre et décrit par sa description", () => {
    rendre();
    const feuille = screen.getByRole("dialog", { name: "Trier les foyers" });
    expect(feuille).toHaveAccessibleDescription("Choisissez l'ordre de la liste.");
    expect(within(feuille).getByText("Trier")).toBeInTheDocument();
    expect(within(feuille).getByRole("button", { name: "Nom du foyer" })).toBeInTheDocument();
  });

  it("n'affiche ni étiquette ni description quand on n'en donne pas", () => {
    rendre({ eyebrow: undefined, description: undefined });
    const feuille = screen.getByRole("dialog", { name: "Trier les foyers" });
    expect(feuille).not.toHaveAttribute("aria-describedby");
    expect(within(feuille).queryByText("Trier")).toBeNull();
  });

  it("ne rend rien quand elle est fermée", () => {
    rendre({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("se ferme par son bouton rond « Fermer »", async () => {
    const { onOpenChange, utilisateur } = rendre();
    await utilisateur.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("se ferme à Échap", async () => {
    const { onOpenChange, utilisateur } = rendre();
    await utilisateur.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("se ferme d'un appui sur le fond assombri", async () => {
    const { onOpenChange, utilisateur } = rendre();
    await utilisateur.click(document.querySelector("[data-feuille-fond]") as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("garde le focus à l'intérieur", () => {
    rendre();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });

  // Sur un petit téléphone, une longue liste ne doit pas pousser le bouton de
  // fermeture hors de l'écran : la feuille plafonne et défile en dedans.
  it("plafonne sa hauteur et défile en dedans, sans animation", () => {
    rendre();
    const feuille = screen.getByRole("dialog");
    expect(feuille.className).toContain("max-h-[85dvh]");
    expect(feuille.className).toContain("overflow-y-auto");
    expect(feuille.className).not.toMatch(/animate|slide|fade/);
  });

  it("rend le focus au bouton qui l'a ouverte", async () => {
    function Banc() {
      const [ouverte, setOuverte] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOuverte(true)}>
            Trier
          </button>
          <BottomSheet open={ouverte} onOpenChange={setOuverte} title="Trier les foyers">
            <p>Contenu</p>
          </BottomSheet>
        </>
      );
    }
    const utilisateur = userEvent.setup();
    render(<Banc />);
    await utilisateur.click(screen.getByRole("button", { name: "Trier" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await utilisateur.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Trier" })).toHaveFocus();
  });
});
