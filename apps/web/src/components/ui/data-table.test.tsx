import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type Column, type DataTableProps } from "./data-table";

interface Foyer {
  id: string;
  nom: string;
  places: string;
}

const FOYERS: Foyer[] = [
  { id: "a1", nom: "Rakotomavo", places: "4 / 4" },
  { id: "b2", nom: "Andriamanana", places: "2 / 3" },
];

const COLONNES: Column<Foyer>[] = [
  { id: "nom", header: "Foyer", cell: (f) => f.nom },
  { id: "places", header: "Places", cell: (f) => f.places },
];

function stubLargeur(bureau: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: bureau,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

afterEach(() => vi.restoreAllMocks());

// Pas de `React.ComponentProps` ici : le fichier n'importe pas le namespace
// React, et l'ajouter pour un type de test le ferait entrer pour rien.
function renderTable(
  extra: Partial<Pick<DataTableProps<Foyer>, "detail" | "detailLabel">> = {},
) {
  return render(
    <DataTable
      caption="Foyers invités"
      columns={COLONNES}
      rows={FOYERS}
      rowKey={(f) => f.id}
      {...extra}
    />,
  );
}

describe("DataTable", () => {
  it("renders a real table on the desktop", () => {
    const restore = stubLargeur(true);
    renderTable();
    const table = screen.getByRole("table", { name: "Foyers invités" });
    expect(within(table).getByText("Rakotomavo")).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Places" })).toBeInTheDocument();
    restore();
  });

  // Le point de la primitive : une seule définition de colonnes, deux rendus.
  it("folds into cards on a phone, from the same columns", () => {
    const restore = stubLargeur(false);
    renderTable();
    expect(screen.queryByRole("table")).toBeNull();
    const liste = screen.getByRole("list", { name: "Foyers invités" });
    expect(within(liste).getByText("Rakotomavo")).toBeInTheDocument();
    // L'en-tête devient une étiquette devant la valeur, sinon « 4 / 4 » ne
    // veut rien dire hors de sa colonne.
    expect(within(liste).getAllByText("Places").length).toBe(2);
    restore();
  });

  // Et jamais les deux à la fois : un DOM dupliqué casserait chaque test de
  // page qui cherche un nom de foyer.
  it("never renders both at once", () => {
    const restore = stubLargeur(true);
    renderTable();
    expect(screen.getAllByText("Rakotomavo")).toHaveLength(1);
    restore();
  });

  it("unfolds a row's detail, and folds it back", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Régime : sans arachide pour {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });

    expect(screen.queryByText(/sans arachide pour Rakotomavo/)).toBeNull();
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
    expect(screen.getByText(/sans arachide pour Rakotomavo/)).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
    expect(screen.queryByText(/sans arachide pour Rakotomavo/)).toBeNull();
    restore();
  });

  it("keeps several rows open at once", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Détail de {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Andriamanana" }));
    expect(screen.getByText("Détail de Rakotomavo")).toBeInTheDocument();
    expect(screen.getByText("Détail de Andriamanana")).toBeInTheDocument();
    restore();
  });

  it("announces whether a row is open", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Détail de {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });
    const bouton = screen.getByRole("button", { name: "Détail de Rakotomavo" });
    expect(bouton).toHaveAttribute("aria-expanded", "false");
    await utilisateur.click(bouton);
    expect(bouton).toHaveAttribute("aria-expanded", "true");
    restore();
  });
});
