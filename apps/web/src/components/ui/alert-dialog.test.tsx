import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlertDialog } from "./alert-dialog";

function renderAlerte(onConfirm = vi.fn(), onOpenChange = vi.fn()) {
  render(
    <AlertDialog
      open
      onOpenChange={onOpenChange}
      title="Supprimer le foyer Rakotomavo ?"
      description="Ce foyer a confirmé 4 personnes. Supprimer efface sa réponse, et son lien cessera de fonctionner."
      confirmLabel="Supprimer le foyer"
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("AlertDialog", () => {
  it("states what disappears, not just a question", () => {
    renderAlerte();
    expect(screen.getByText(/son lien cessera de fonctionner/)).toBeInTheDocument();
  });

  // Le geste par défaut d'un dialogue destructif est de ne rien détruire :
  // une frappe sur Entrée à l'ouverture doit annuler, pas supprimer.
  it("puts the opening focus on Annuler, never on the destructive action", async () => {
    renderAlerte();
    await waitFor(() => expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus());
  });

  it("calls back only when the destructive button is pressed", async () => {
    const utilisateur = userEvent.setup();
    const { onConfirm } = renderAlerte();
    await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer le foyer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("names the action with its verb, so the button alone is unambiguous", () => {
    renderAlerte();
    expect(screen.queryByRole("button", { name: "OK" })).toBeNull();
    expect(screen.getByRole("button", { name: "Supprimer le foyer" })).toBeInTheDocument();
  });
});
