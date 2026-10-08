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

describe("DataTable colonne extensible", () => {
  // Sans `grow`, l'espace en trop se répartit entre toutes les colonnes : le nom
  // du foyer, seule colonne qui peut être longue, restait à l'étroit entre deux
  // colonnes élargies pour rien. jsdom ne mesure aucune largeur : ce test
  // verrouille les classes, Chrome dit si elles tiennent.
  it("lets one column take the remaining width and shrinks the others to their content", () => {
    const restore = stubLargeur(true);
    render(
      <DataTable
        caption="Foyers invités"
        columns={[
          { id: "nom", header: "Foyer", cell: (f: Foyer) => f.nom, grow: true },
          { id: "places", header: "Places", cell: (f: Foyer) => f.places },
        ]}
        rows={FOYERS}
        rowKey={(f) => f.id}
      />,
    );
    const entetes = screen.getAllByRole("columnheader");
    expect(entetes[0]).toHaveClass("w-full");
    expect(entetes[1]).toHaveClass("w-px", "whitespace-nowrap");
    const cellule = screen.getAllByRole("row")[1].querySelectorAll("td");
    expect(cellule[0]).toHaveClass("w-full");
    expect(cellule[1]).toHaveClass("w-px", "whitespace-nowrap");
    restore();
  });

  it("leaves the columns alone when none is marked to grow", () => {
    const restore = stubLargeur(true);
    renderTable();
    for (const th of screen.getAllByRole("columnheader")) {
      expect(th).not.toHaveClass("w-full");
      expect(th).not.toHaveClass("w-px");
    }
    restore();
  });
});

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

  // Maquette : FOYER, PLACES… en petites capitales, en or foncé — jamais l'or
  // ornemental, qui ne porte pas de texte.
  it("writes the headers in small dark-gold capitals", () => {
    const restore = stubLargeur(true);
    renderTable();
    const entete = screen.getByRole("columnheader", { name: "Places" });
    expect(entete).toHaveClass("uppercase", "text-gold-ink");
    restore();
  });

  // Le chevron est un rond ; rempli de bordeaux quand la ligne est ouverte.
  // L'état reste dit par `aria-expanded` et par la flèche retournée, pas par
  // la seule couleur.
  it("fills the round unfold button when the row is open", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Détail de {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });
    const bouton = screen.getByRole("button", { name: "Détail de Rakotomavo" });
    expect(bouton).toHaveClass("h-10", "w-10");
    const rond = bouton.firstElementChild as HTMLElement;
    expect(rond).toHaveClass("rounded-full");
    expect(rond).not.toHaveClass("bg-bordeaux-700");
    await utilisateur.click(bouton);
    expect(rond).toHaveClass("bg-bordeaux-700");
    restore();
  });

  // L'écran Foyers pagine : la page tient l'état de dépli pour qu'il survive
  // au changement de page, que la table remplace ses lignes ou non.
  describe("when the caller owns the unfolded rows", () => {
    function renderControle(ouverts: ReadonlySet<string>, onToggleExpanded = vi.fn()) {
      const vue = render(
        <DataTable
          caption="Foyers invités"
          columns={COLONNES}
          rows={FOYERS}
          rowKey={(f) => f.id}
          detail={(f: Foyer) => <p>Détail de {f.nom}</p>}
          detailLabel={(f: Foyer) => `Détail de ${f.nom}`}
          expanded={ouverts}
          onToggleExpanded={onToggleExpanded}
        />,
      );
      return { ...vue, onToggleExpanded };
    }

    it("shows the rows it is told are open", () => {
      const restore = stubLargeur(true);
      renderControle(new Set(["b2"]));
      expect(screen.getByText("Détail de Andriamanana")).toBeInTheDocument();
      expect(screen.queryByText("Détail de Rakotomavo")).toBeNull();
      expect(screen.getByRole("button", { name: "Détail de Andriamanana" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      restore();
    });

    it("reports the toggle instead of applying it itself", async () => {
      const restore = stubLargeur(true);
      const utilisateur = userEvent.setup();
      const { onToggleExpanded } = renderControle(new Set());
      await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
      expect(onToggleExpanded).toHaveBeenCalledWith("a1");
      // Rien ne s'ouvre tant que l'appelant ne l'a pas décidé.
      expect(screen.queryByText("Détail de Rakotomavo")).toBeNull();
      restore();
    });

    it("works the same in cards on a phone", () => {
      const restore = stubLargeur(false);
      renderControle(new Set(["a1"]));
      expect(screen.getByText("Détail de Rakotomavo")).toBeInTheDocument();
      restore();
    });
  });

  // Un écran peut dessiner ses propres cartes (Foyers : nom, statut, boutons) ;
  // la table ne connaît pas Foyers, elle lui passe l'état de dépli.
  describe("with a card drawn by the caller", () => {
    function renderCartes(ouverts: ReadonlySet<string>, onToggleExpanded = vi.fn()) {
      render(
        <DataTable
          caption="Foyers invités"
          columns={COLONNES}
          rows={FOYERS}
          rowKey={(f) => f.id}
          expanded={ouverts}
          onToggleExpanded={onToggleExpanded}
          renderCard={(f: Foyer, { ouvert, basculer }) => (
            <button type="button" aria-expanded={ouvert} onClick={basculer}>
              Carte {f.nom}
            </button>
          )}
        />,
      );
      return { onToggleExpanded };
    }

    it("draws the caller's card on a phone, in a list named by the caption", () => {
      const restore = stubLargeur(false);
      renderCartes(new Set(["b2"]));
      const liste = screen.getByRole("list", { name: "Foyers invités" });
      expect(within(liste).getAllByRole("listitem")).toHaveLength(2);
      expect(within(liste).getByRole("button", { name: "Carte Rakotomavo" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(within(liste).getByRole("button", { name: "Carte Andriamanana" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      // La carte générique (étiquette devant chaque valeur) n'est pas rendue.
      expect(screen.queryByText("Places")).toBeNull();
      restore();
    });

    it("hands the card the toggle of its own row", async () => {
      const restore = stubLargeur(false);
      const utilisateur = userEvent.setup();
      const { onToggleExpanded } = renderCartes(new Set());
      await utilisateur.click(screen.getByRole("button", { name: "Carte Andriamanana" }));
      expect(onToggleExpanded).toHaveBeenCalledWith("b2");
      restore();
    });

    it("keeps the real table on the desktop", () => {
      const restore = stubLargeur(true);
      renderCartes(new Set());
      expect(screen.getByRole("table", { name: "Foyers invités" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Carte/ })).toBeNull();
      restore();
    });
  });
});
