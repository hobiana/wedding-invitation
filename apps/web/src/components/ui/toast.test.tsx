import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "./toast";
import { useToast } from "./use-toast";

function Declencheur({ message, tone }: { message: string; tone?: "success" | "error" }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ message, tone })}>
      Déclencher
    </button>
  );
}

function rendre(props: { message: string; tone?: "success" | "error" }) {
  return render(
    <ToastProvider>
      <Declencheur {...props} />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  it("affiche le message d'un geste réussi", async () => {
    const user = userEvent.setup();
    rendre({ message: "Famille Rakoto placée à la table Collègues." });

    await user.click(screen.getByRole("button", { name: "Déclencher" }));

    expect(await screen.findByText("Famille Rakoto placée à la table Collègues.")).toBeInTheDocument();
  });

  it("empile plusieurs messages sans en perdre", async () => {
    const user = userEvent.setup();
    rendre({ message: "Table créée." });

    await user.click(screen.getByRole("button", { name: "Déclencher" }));
    await user.click(screen.getByRole("button", { name: "Déclencher" }));

    expect(await screen.findAllByText("Table créée.")).toHaveLength(2);
  });

  it("se ferme au bouton Fermer", async () => {
    const user = userEvent.setup();
    rendre({ message: "Table supprimée." });
    await user.click(screen.getByRole("button", { name: "Déclencher" }));
    await screen.findByText("Table supprimée.");

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    // Radix retire le contenu après sa propre sortie : on attend une disparition
    // réelle plutôt que de supposer qu'elle est synchrone.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByText("Table supprimée.")).toBeNull();
  });

  it("marque une erreur comme urgente pour les lecteurs d'écran", async () => {
    const user = userEvent.setup();
    rendre({ message: "Cette table n'a plus assez de places.", tone: "error" });

    await user.click(screen.getByRole("button", { name: "Déclencher" }));

    const message = await screen.findByText("Cette table n'a plus assez de places.");
    // Radix annonce `foreground` en assertif, `background` en poli.
    expect(message.closest("[data-tone]")).toHaveAttribute("data-tone", "error");
  });

  it("refuse d'être utilisé hors de son fournisseur", () => {
    // Un `toast()` sans fournisseur serait un geste muet : mieux vaut casser
    // fort en développement qu'afficher un écran qui ne confirme plus rien.
    const sansFournisseur = () => render(<Declencheur message="x" />);
    expect(sansFournisseur).toThrow(/ToastProvider/);
  });
});
