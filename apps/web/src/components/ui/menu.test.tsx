import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Menu, MenuItem } from "./menu";
import { Dialog } from "./dialog";
import { AlertDialog } from "./alert-dialog";

function rendreMenu() {
  const onModifier = vi.fn();
  const onSupprimer = vi.fn();
  render(
    <>
      <button type="button">Avant</button>
      <Menu label="Actions pour Famille Rakoto">
        <MenuItem onSelect={onModifier}>Modifier</MenuItem>
        <MenuItem destructive onSelect={onSupprimer}>
          Supprimer
        </MenuItem>
      </Menu>
    </>,
  );
  return { onModifier, onSupprimer, utilisateur: userEvent.setup() };
}

describe("Menu", () => {
  it("nomme son déclencheur « … » par le libellé fourni, menu fermé", () => {
    rendreMenu();
    const declencheur = screen.getByRole("button", { name: "Actions pour Famille Rakoto" });
    expect(declencheur).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ouvre le menu au clic et liste ses éléments", async () => {
    const { utilisateur } = rendreMenu();
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Rakoto" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Modifier" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Supprimer" })).toBeInTheDocument();
  });

  it("appelle onSelect de l'élément choisi, et lui seul", async () => {
    const { onModifier, onSupprimer, utilisateur } = rendreMenu();
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Rakoto" }));
    await utilisateur.click(screen.getByRole("menuitem", { name: "Supprimer" }));
    await waitFor(() => expect(onSupprimer).toHaveBeenCalledTimes(1));
    expect(onModifier).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("s'utilise entièrement au clavier : Entrée ouvre, flèche descend, Entrée choisit", async () => {
    const { onSupprimer, utilisateur } = rendreMenu();
    await utilisateur.tab();
    await utilisateur.tab();
    expect(screen.getByRole("button", { name: "Actions pour Famille Rakoto" })).toHaveFocus();
    await utilisateur.keyboard("{Enter}");
    expect(screen.getByRole("menuitem", { name: "Modifier" })).toHaveFocus();
    await utilisateur.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(onSupprimer).toHaveBeenCalledTimes(1));
  });

  it("rend le focus au déclencheur quand on le ferme à Échap", async () => {
    const { utilisateur } = rendreMenu();
    const declencheur = screen.getByRole("button", { name: "Actions pour Famille Rakoto" });
    await utilisateur.click(declencheur);
    await utilisateur.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(declencheur).toHaveFocus());
  });

  // La suppression se distingue par sa couleur ET par son libellé : le rouge
  // vient du jeton, jamais d'un `red-600` planté en dur.
  it("peint l'élément destructif au jeton danger, et l'autre à l'encre", async () => {
    const { utilisateur } = rendreMenu();
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Rakoto" }));
    const supprimer = screen.getByRole("menuitem", { name: "Supprimer" });
    expect(supprimer.className).toContain("text-danger");
    expect(supprimer.className).not.toMatch(/\bred-\d/);
    expect(screen.getByRole("menuitem", { name: "Modifier" }).className).not.toContain("text-danger");
  });

  it("offre au doigt des cibles de 40 px au moins, déclencheur et éléments", async () => {
    const { utilisateur } = rendreMenu();
    const declencheur = screen.getByRole("button", { name: "Actions pour Famille Rakoto" });
    expect(declencheur.className).toMatch(/\b(h|min-h)-1[0-9]\b/);
    expect(declencheur.className).toMatch(/\b(w|min-w)-1[0-9]\b/);
    await utilisateur.click(declencheur);
    expect(screen.getByRole("menuitem", { name: "Modifier" }).className).toMatch(/\bmin-h-1[0-9]\b/);
  });

  // L'admin n'anime rien : pas de classe d'entrée, de fondu ou de glissé.
  it("n'anime pas l'ouverture du menu", async () => {
    const { utilisateur } = rendreMenu();
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Rakoto" }));
    expect(screen.getByRole("menu").className).not.toMatch(/animate|slide|fade|zoom/);
  });
});

/**
 * Le cas critique : « Modifier » ouvre un Dialog, « Supprimer » un
 * AlertDialog, montés par l'état de la page sans `<Trigger>` Radix. Le
 * dialogue mémorise au rendu l'élément focalisé (`useFocusDeRetour`) pour le
 * lui rendre à la fermeture. Si `onSelect` tournait pendant que l'élément du
 * menu porte encore le focus, c'est cet élément — démonté une fraction de
 * seconde plus tard — qu'il retiendrait, et le focus finirait sur `<body>`.
 */
function BancLigne({ supprimeLaLigne = false }: { supprimeLaLigne?: boolean }) {
  const [dialogue, setDialogue] = useState<"modifier" | "supprimer" | null>(null);
  const [ligneLa, setLigneLa] = useState(true);
  return (
    <>
      {ligneLa && (
        <Menu label="Actions pour Famille Rakoto">
          <MenuItem onSelect={() => setDialogue("modifier")}>Modifier</MenuItem>
          <MenuItem destructive onSelect={() => setDialogue("supprimer")}>
            Supprimer
          </MenuItem>
        </Menu>
      )}
      {dialogue === "modifier" && (
        <Dialog open onOpenChange={(o) => !o && setDialogue(null)} title="Modifier le foyer">
          <input aria-label="Nom du foyer" />
        </Dialog>
      )}
      {dialogue === "supprimer" && (
        <AlertDialog
          open
          onOpenChange={(o) => !o && setDialogue(null)}
          title="Supprimer le foyer ?"
          description="Sa réponse et son lien sont perdus."
          confirmLabel="Supprimer le foyer"
          onConfirm={() => {
            if (supprimeLaLigne) setLigneLa(false);
            setDialogue(null);
          }}
        />
      )}
    </>
  );
}

describe("Menu qui ouvre un dialogue", () => {
  it("donne le focus au Dialog ouvert par « Modifier », puis le rend au déclencheur", async () => {
    const utilisateur = userEvent.setup();
    render(<BancLigne />);
    const declencheur = screen.getByRole("button", { name: "Actions pour Famille Rakoto" });

    await utilisateur.click(declencheur);
    await utilisateur.click(screen.getByRole("menuitem", { name: "Modifier" }));

    const dialogue = await screen.findByRole("dialog", { name: "Modifier le foyer" });
    await waitFor(() => expect(dialogue).toContainElement(document.activeElement as HTMLElement));

    await utilisateur.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(declencheur).toHaveFocus());
  });

  it("donne le focus à l'AlertDialog ouvert au clavier par « Supprimer », puis le rend au déclencheur", async () => {
    const utilisateur = userEvent.setup();
    render(<BancLigne />);
    const declencheur = screen.getByRole("button", { name: "Actions pour Famille Rakoto" });

    declencheur.focus();
    await utilisateur.keyboard("{Enter}");
    await utilisateur.keyboard("{ArrowDown}{Enter}");

    const alerte = await screen.findByRole("alertdialog", { name: "Supprimer le foyer ?" });
    await waitFor(() => expect(alerte).toContainElement(document.activeElement as HTMLElement));

    await utilisateur.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(declencheur).toHaveFocus());
  });

  // La ligne disparaît avec sa suppression : le déclencheur n'existe plus, et
  // focaliser un nœud détaché ne fait rien. Le menu ne peut pas inventer de
  // repère — c'est à la page d'en désigner un. Ce qu'on verrouille ici : rien
  // ne lève, et le focus n'est pas resté sur un nœud détaché.
  it("ne laisse pas le focus sur un nœud détaché quand la ligne est supprimée", async () => {
    const utilisateur = userEvent.setup();
    render(<BancLigne supprimeLaLigne />);
    await utilisateur.click(screen.getByRole("button", { name: "Actions pour Famille Rakoto" }));
    await utilisateur.click(screen.getByRole("menuitem", { name: "Supprimer" }));
    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "Actions pour Famille Rakoto" })).toBeNull();
    await waitFor(() => expect(document.contains(document.activeElement)).toBe(true));
  });
});
