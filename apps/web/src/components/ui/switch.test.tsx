import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("is a switch named by its visible label", () => {
    render(<Switch checked label="Afficher les membres" onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Afficher les membres" })).toBeInTheDocument();
  });

  // L'état est dit à l'assistance technique, pas porté par la seule teinte.
  it("tells its state through aria-checked", () => {
    const { rerender } = render(<Switch checked label="Afficher les membres" onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    rerender(<Switch checked={false} label="Afficher les membres" onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("reports the new state on a click", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} label="Afficher les membres" onCheckedChange={onCheckedChange} />);
    await userEvent.setup().click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  // Le libellé fait partie de la cible : on vise « Afficher les membres », pas
  // seulement la petite piste.
  it("toggles from a click on its label", async () => {
    function Banc() {
      const [actif, setActif] = useState(true);
      return <Switch checked={actif} label="Afficher les membres" onCheckedChange={setActif} />;
    }
    render(<Banc />);
    await userEvent.setup().click(screen.getByText("Afficher les membres"));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("toggles from the keyboard with Space", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked label="Afficher les membres" onCheckedChange={onCheckedChange} />);
    const utilisateur = userEvent.setup();
    await utilisateur.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await utilisateur.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("uses the id it is given", () => {
    render(<Switch id="membres" checked label="Afficher les membres" onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("id", "membres");
  });

  it("fills its track in bordeaux when on, from the theme tokens", () => {
    render(<Switch checked label="Afficher les membres" onCheckedChange={vi.fn()} />);
    const piste = screen.getByRole("switch");
    expect(piste.className).toContain("data-[state=checked]:bg-bordeaux-700");
    expect(piste.className).not.toMatch(/(red|rose|gray|neutral|slate)-\d{2,3}/);
  });

  // Cible tactile ≥ 40 px : la ligne entière (piste + libellé) fait 40 px de haut.
  it("offers a touch target at least 40 px high", () => {
    render(<Switch checked label="Afficher les membres" onCheckedChange={vi.fn()} />);
    expect(screen.getByText("Afficher les membres").closest("label")?.className).toContain("min-h-10");
  });
});
