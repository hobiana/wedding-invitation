import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterPills } from "./filter-pills";

const STATUTS = [
  { value: "ALL", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "CONFIRMED", label: "Confirmés" },
  { value: "DECLINED", label: "Déclinés" },
];

describe("FilterPills", () => {
  it("is a group named after what it filters", () => {
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={vi.fn()} />);
    const groupe = screen.getByRole("group", { name: "Filtrer par statut" });
    expect(within(groupe).getAllByRole("button")).toHaveLength(4);
  });

  // Le choix actif est dit par `aria-pressed`, pas par le seul remplissage.
  it("marks the chosen pill as pressed, and only that one", () => {
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="CONFIRMED" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Confirmés" })).toHaveAttribute("aria-pressed", "true");
    for (const nom of ["Tous", "En attente", "Déclinés"]) {
      expect(screen.getByRole("button", { name: nom })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("reports the value of the pill tapped", async () => {
    const onChange = vi.fn();
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "En attente" }));
    expect(onChange).toHaveBeenCalledWith("PENDING");
  });

  it("moves the choice when driven by its parent", async () => {
    function Banc() {
      const [valeur, setValeur] = useState("ALL");
      return <FilterPills label="Filtrer par statut" options={STATUTS} value={valeur} onChange={setValeur} />;
    }
    render(<Banc />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Déclinés" }));
    expect(screen.getByRole("button", { name: "Déclinés" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Tous" })).toHaveAttribute("aria-pressed", "false");
  });

  it("is reachable and operable from the keyboard", async () => {
    const onChange = vi.fn();
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={onChange} />);
    const utilisateur = userEvent.setup();
    await utilisateur.tab();
    await utilisateur.tab();
    expect(screen.getByRole("button", { name: "En attente" })).toHaveFocus();
    await utilisateur.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("PENDING");
  });

  it("never submits a surrounding form", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={vi.fn()} />
      </form>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmés" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("fills the active pill in bordeaux with ivory text, and outlines the others", () => {
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={vi.fn()} />);
    const active = screen.getByRole("button", { name: "Tous" }).className;
    const inactive = screen.getByRole("button", { name: "Confirmés" }).className;
    expect(active).toContain("bg-bordeaux-700");
    expect(active).toContain("text-on-bordeaux");
    expect(inactive).toContain("border-rule");
    expect(inactive).not.toContain("bg-bordeaux-700");
  });

  it("is round and at least 40 px high", () => {
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={vi.fn()} />);
    const classes = screen.getByRole("button", { name: "Tous" }).className;
    expect(classes).toContain("rounded-full");
    expect(classes).toContain("min-h-10");
  });

  // Au téléphone, quatre pastilles et « Trier » ne tiennent pas : la rangée
  // défile au lieu de passer à la ligne.
  it("scrolls sideways instead of wrapping", () => {
    render(<FilterPills label="Filtrer par statut" options={STATUTS} value="ALL" onChange={vi.fn()} />);
    const classes = screen.getByRole("group").className;
    expect(classes).toContain("overflow-x-auto");
    expect(classes).not.toContain("flex-wrap");
  });
});
