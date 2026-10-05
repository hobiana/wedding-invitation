import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OngletsTelephone } from "./OngletsTelephone";

function Banc() {
  const [actif, setActif] = useState("a-placer");
  return (
    <OngletsTelephone
      libelle="Vues du plan de table"
      actif={actif}
      onChange={setActif}
      onglets={[
        { id: "a-placer", titre: "À placer · 6", contenu: <p>Liste des foyers</p> },
        { id: "tables", titre: "Tables · 4", contenu: <p>Liste des tables</p> },
      ]}
    />
  );
}

describe("OngletsTelephone", () => {
  it("names the tab list and selects the first tab", () => {
    render(<Banc />);
    expect(screen.getByRole("tablist", { name: "Vues du plan de table" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "À placer · 6" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tables · 4" })).toHaveAttribute("aria-selected", "false");
  });

  it("labels the panel with its tab and shows only its content", () => {
    render(<Banc />);
    expect(screen.getByRole("tabpanel", { name: "À placer · 6" })).toHaveTextContent("Liste des foyers");
    expect(screen.queryByText("Liste des tables")).not.toBeInTheDocument();
  });

  it("switches panel on a tap", async () => {
    render(<Banc />);
    await userEvent.setup().click(screen.getByRole("tab", { name: "Tables · 4" }));
    expect(screen.getByRole("tab", { name: "Tables · 4" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Tables · 4" })).toHaveTextContent("Liste des tables");
  });

  // Une seule étape de tabulation pour la liste ; les flèches passent d'un onglet à l'autre.
  it("keeps only the selected tab in the tab order", () => {
    render(<Banc />);
    expect(screen.getByRole("tab", { name: "À placer · 6" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Tables · 4" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves with the arrow keys, wrapping around, and follows the focus", async () => {
    const utilisateur = userEvent.setup();
    render(<Banc />);
    await utilisateur.click(screen.getByRole("tab", { name: "À placer · 6" }));

    await utilisateur.keyboard("{ArrowRight}");
    const tables = screen.getByRole("tab", { name: "Tables · 4" });
    expect(tables).toHaveFocus();
    expect(tables).toHaveAttribute("aria-selected", "true");

    await utilisateur.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "À placer · 6" })).toHaveFocus();

    await utilisateur.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Tables · 4" })).toHaveFocus();
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const utilisateur = userEvent.setup();
    render(<Banc />);
    await utilisateur.click(screen.getByRole("tab", { name: "À placer · 6" }));
    await utilisateur.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Tables · 4" })).toHaveFocus();
    await utilisateur.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "À placer · 6" })).toHaveAttribute("aria-selected", "true");
  });
});
