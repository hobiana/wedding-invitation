import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TableForm, type TableFormProps } from "./TableForm";

function rendre(props: Partial<TableFormProps> = {}) {
  const rappels = { onTerminer: vi.fn(), onFermer: vi.fn(), onSupprimer: vi.fn() };
  render(<TableForm mode="creation" nomInitial="Table 7" capaciteInitiale={10} {...rappels} {...props} />);
  return { utilisateur: userEvent.setup(), ...rappels };
}

describe("TableForm creation", () => {
  it("starts from the prefilled name and capacity, focused on the name", () => {
    rendre();
    expect(screen.getByLabelText("Nom")).toHaveValue("Table 7");
    expect(screen.getByLabelText("Capacité")).toHaveValue(10);
    expect(screen.getByLabelText("Nom")).toHaveFocus();
  });

  it("sends the trimmed name and the capacity on « Terminé »", async () => {
    const { utilisateur, onTerminer } = rendre();
    await utilisateur.clear(screen.getByLabelText("Nom"));
    await utilisateur.type(screen.getByLabelText("Nom"), "  Collègues ");
    await utilisateur.click(screen.getByRole("button", { name: "Ajouter une place" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(onTerminer).toHaveBeenCalledWith({ name: "Collègues", capacity: 11 });
  });

  it("steps the capacity down, never below one", async () => {
    const { utilisateur } = rendre({ capaciteInitiale: 2 });
    const moins = screen.getByRole("button", { name: "Retirer une place" });
    await utilisateur.click(moins);
    expect(screen.getByLabelText("Capacité")).toHaveValue(1);
    expect(moins).toBeDisabled();
  });

  it("cancels with « Annuler », which a new table offers instead of « Supprimer »", async () => {
    const { utilisateur, onFermer } = rendre();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onFermer).toHaveBeenCalledOnce();
  });

  it("closes on Escape without sending anything", async () => {
    const { utilisateur, onFermer, onTerminer } = rendre();
    await utilisateur.keyboard("{Escape}");
    expect(onFermer).toHaveBeenCalledOnce();
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("refuses an empty name before sending anything", async () => {
    const { utilisateur, onTerminer } = rendre();
    await utilisateur.clear(screen.getByLabelText("Nom"));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Donnez un nom à la table.");
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("refuses an empty capacity before sending anything", async () => {
    const { utilisateur, onTerminer } = rendre();
    await utilisateur.clear(screen.getByLabelText("Capacité"));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(screen.getByRole("alert")).toHaveTextContent("La capacité doit être d'au moins 1 place.");
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("cannot be finished twice while the first request runs", () => {
    rendre({ enCours: true });
    expect(screen.getByRole("button", { name: "Terminé" })).toBeDisabled();
  });
});

describe("TableForm modification", () => {
  it("offers « Supprimer » instead of « Annuler »", async () => {
    const { utilisateur, onSupprimer } = rendre({ mode: "modification", nomInitial: "Les témoins" });
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onSupprimer).toHaveBeenCalledOnce();
  });

  // Le serveur refuserait : on le dit avant, en français, et sans rien envoyer.
  it("says the capacity cannot go under the seats already taken", async () => {
    const { utilisateur, onTerminer } = rendre({ mode: "modification", capaciteInitiale: 8, occupees: 5 });
    await utilisateur.clear(screen.getByLabelText("Capacité"));
    await utilisateur.type(screen.getByLabelText("Capacité"), "4");
    expect(screen.getByRole("alert")).toHaveTextContent("Au moins 5 places : déjà occupées.");
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(onTerminer).not.toHaveBeenCalled();
  });

  it("agrees the message for a single seat taken", async () => {
    const { utilisateur } = rendre({ mode: "modification", capaciteInitiale: 3, occupees: 1 });
    await utilisateur.clear(screen.getByLabelText("Capacité"));
    await utilisateur.type(screen.getByLabelText("Capacité"), "0");
    expect(screen.getByRole("alert")).toHaveTextContent("Au moins 1 place : déjà occupée.");
  });

  it("stops the minus button at the seats already taken", () => {
    rendre({ mode: "modification", capaciteInitiale: 5, occupees: 5 });
    expect(screen.getByRole("button", { name: "Retirer une place" })).toBeDisabled();
  });

  it("ties the capacity error to its field", async () => {
    const { utilisateur } = rendre({ mode: "modification", capaciteInitiale: 8, occupees: 5 });
    await utilisateur.clear(screen.getByLabelText("Capacité"));
    await utilisateur.type(screen.getByLabelText("Capacité"), "3");
    expect(screen.getByLabelText("Capacité")).toHaveAccessibleDescription("Au moins 5 places : déjà occupées.");
    expect(screen.getByLabelText("Capacité")).toHaveAttribute("aria-invalid", "true");
  });
});
