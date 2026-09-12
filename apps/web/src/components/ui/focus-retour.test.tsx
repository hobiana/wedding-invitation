import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog } from "./dialog";
import { AlertDialog } from "./alert-dialog";

/**
 * Les deux primitives sont montées par l'état de la page — `{ouvert && <Dialog
 * open …>}` — et jamais par un `<Trigger>` de Radix (ruling R8). Or le contenu
 * modal de Radix annule la restitution de FocusScope puis focalise son propre
 * `triggerRef`, qui reste `null` sans déclencheur : le focus retombe sur
 * `<body>`.
 *
 * Ce que ça coûte : l'organisateur qui ferme le dialogue d'une ligne se
 * retrouve en haut du document et doit retraverser les quarante lignes de la
 * table pour revenir où il était. Relevé à l'écran, pas en test — c'est la
 * tâche de vérification au navigateur qui l'a attrapé.
 */

function Banc({ variante }: { variante: "dialog" | "alert" }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button onClick={() => setOuvert(true)}>Supprimer</button>
      {ouvert &&
        (variante === "dialog" ? (
          <Dialog open onOpenChange={(o) => !o && setOuvert(false)} title="Modifier le foyer">
            <p>Contenu</p>
          </Dialog>
        ) : (
          <AlertDialog
            open
            onOpenChange={(o) => !o && setOuvert(false)}
            title="Supprimer le foyer ?"
            description="Sa réponse et son lien sont perdus."
            confirmLabel="Supprimer le foyer"
            onConfirm={() => setOuvert(false)}
          />
        ))}
    </>
  );
}

describe("retour du focus à la fermeture", () => {
  it("rend le focus au bouton qui a ouvert le Dialog", async () => {
    const utilisateur = userEvent.setup();
    render(<Banc variante="dialog" />);
    const declencheur = screen.getByRole("button", { name: "Supprimer" });

    await utilisateur.click(declencheur);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await utilisateur.keyboard("{Escape}");
    expect(document.activeElement).toBe(declencheur);
  });

  it("rend le focus au bouton qui a ouvert l'AlertDialog", async () => {
    const utilisateur = userEvent.setup();
    render(<Banc variante="alert" />);
    const declencheur = screen.getByRole("button", { name: "Supprimer" });

    await utilisateur.click(declencheur);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await utilisateur.keyboard("{Escape}");
    expect(document.activeElement).toBe(declencheur);
  });

  // Après une suppression confirmée, la ligne — et son bouton — n'existent
  // plus. Focaliser un nœud détaché ne fait rien et laisse le focus sur
  // `<body>` sans que rien ne le signale ; la primitive ne doit pas s'y
  // essayer.
  it("ne tente rien quand le déclencheur a disparu entre-temps", async () => {
    const utilisateur = userEvent.setup();

    function BancQuiDisparait() {
      const [ouvert, setOuvert] = useState(false);
      const [ligneLa, setLigneLa] = useState(true);
      return (
        <>
          {ligneLa && <button onClick={() => setOuvert(true)}>Supprimer</button>}
          {ouvert && (
            <AlertDialog
              open
              onOpenChange={(o) => !o && setOuvert(false)}
              title="Supprimer le foyer ?"
              description="Sa réponse et son lien sont perdus."
              confirmLabel="Supprimer le foyer"
              onConfirm={() => {
                setLigneLa(false);
                setOuvert(false);
              }}
            />
          )}
        </>
      );
    }

    render(<BancQuiDisparait />);
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer" }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer le foyer" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Supprimer" })).toBeNull();
  });
});
