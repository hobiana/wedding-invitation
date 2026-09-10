import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeatingPlanSection } from "./SeatingPlanSection";

const PLAN = {
  tableName: "Table des Baobabs",
  neighbors: [
    { displayName: "Famille Rakoto", confirmedCount: 4 },
    { displayName: "Famille Andria", confirmedCount: 2 },
  ],
};

describe("SeatingPlanSection", () => {
  // Invariant 6 : le plan ne s'affiche que si l'admin l'a activé, et c'est
  // l'API qui renvoie `null` — le front ne masque jamais des données qu'il
  // aurait reçues, il n'en reçoit pas.
  it("renders nothing when the API sends no plan", () => {
    const { container } = render(<SeatingPlanSection seatingPlan={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the table in a heading, under an À TABLE eyebrow", () => {
    render(<SeatingPlanSection seatingPlan={PLAN} />);

    const section = within(screen.getByRole("region", { name: /à table/i }));
    expect(section.getByRole("heading", { name: "Table des Baobabs" })).toBeInTheDocument();
  });

  it("lists the neighbouring households with how many of them are coming", () => {
    render(<SeatingPlanSection seatingPlan={PLAN} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/Famille Rakoto\s*—\s*4/);
    expect(items[1]).toHaveTextContent(/Famille Andria\s*—\s*2/);
  });

  // L'invariant `confirmedCount` nullable, jusque dans la liste des voisins :
  // `null` dit « ce foyer n'a pas encore répondu », `0` dit « il a répondu que
  // personne ne vient ». Rendre « — 0 » sur un `null` prête un refus à un
  // voisin qui n'a rien dit — et le tiret est déjà le séparateur, donc le
  // « ?? "—" » du dashboard donnerait ici « — — ». Le nom seul, sans
  // séparateur : le nombre est une précision, et il n'y en a pas à donner.
  it("shows only the name of a neighbour who has not answered yet", () => {
    render(
      <SeatingPlanSection
        seatingPlan={{
          tableName: "Table des Baobabs",
          neighbors: [{ displayName: "Fara Rakotomavo", confirmedCount: null }],
        }}
      />,
    );

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(/^Fara Rakotomavo$/);
    expect(item.textContent).not.toContain("—");
  });

  it("still shows the zero of a neighbour who answered that nobody is coming", () => {
    render(
      <SeatingPlanSection
        seatingPlan={{
          tableName: "Table des Baobabs",
          neighbors: [{ displayName: "Famille Rasoanaivo", confirmedCount: 0 }],
        }}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(/^Famille Rasoanaivo\s*—\s*0$/);
  });

  // Un foyer seul à sa table doit tout de même savoir où s'asseoir : c'est
  // l'information qui compte, la liste de voisins est le supplément.
  it("still names the table when the household sits alone at it", () => {
    render(<SeatingPlanSection seatingPlan={{ tableName: "Table des Ravinala", neighbors: [] }} />);

    expect(screen.getByRole("heading", { name: "Table des Ravinala" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
