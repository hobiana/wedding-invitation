import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("names itself for assistive technology", () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Modifier le foyer" })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", async () => {
    const onOpenChange = vi.fn();
    const utilisateur = userEvent.setup();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    await utilisateur.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("offers a labelled close button", async () => {
    const onOpenChange = vi.fn();
    const utilisateur = userEvent.setup();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    await utilisateur.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
