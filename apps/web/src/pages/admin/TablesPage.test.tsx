import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { HouseholdAdminDto, Page, TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { TablesPage } from "./TablesPage";
import * as apiModule from "@/lib/api";

function table(partiel: Partial<TableDto> = {}): TableDto {
  return {
    id: "t1",
    name: "Table 1",
    capacity: 8,
    households: [],
    ...partiel,
  };
}

function foyerDeTable(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return {
    id: "a1",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    confirmedCount: null,
    status: "PENDING",
    ...partiel,
  };
}

const TABLE_UNIQUE: TableDto[] = [table()];

/** L'enveloppe de `GET /admin/households`, complète sauf `total` contraire. */
function pageDe(items: HouseholdAdminDto[], total = items.length): Page<HouseholdAdminDto> {
  return { items, total, limit: 500, offset: 0 };
}

function renderPage({ tables = TABLE_UNIQUE }: { tables?: TableDto[] } = {}) {
  vi.spyOn(apiModule.api, "get").mockImplementation((path: string) =>
    Promise.resolve(path === "/admin/tables" ? tables : pageDe([])),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TablesPage />
    </QueryClientProvider>,
  );
}

describe("TablesPage table management", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists each table with its capacity", async () => {
    renderPage();
    expect(await screen.findByText(/Table 1 — 8 places/)).toBeInTheDocument();
  });

  // PATCH /admin/tables/:id existed but nothing in the UI reached it.
  it("renames a table and changes its capacity", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /modifier/i }));
    fireEvent.change(screen.getByLabelText(/nom de table 1/i), { target: { value: "Table des amis" } });
    fireEvent.change(screen.getByLabelText(/capacité de table 1/i), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith("/admin/tables/t1", {
        name: "Table des amis",
        capacity: 12,
      }),
    );
  });

  // DELETE /admin/tables/:id was likewise unreachable. Deleting is now guarded
  // by a confirmation (task 18) : the DELETE only fires once it is pressed.
  it("deletes a table once the confirmation is pressed", async () => {
    const deleteSpy = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer la table" }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("/admin/tables/t1"));
  });

  it("sends the chosen capacity when creating a table instead of always defaulting to 10", async () => {
    const postSpy = vi.spyOn(apiModule.api, "post").mockResolvedValue({});
    renderPage();

    fireEvent.change(await screen.findByLabelText(/nom de la table/i), { target: { value: "Table 2" } });
    fireEvent.change(screen.getByLabelText(/^capacité$/i), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: /ajouter une table/i }));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith("/admin/tables", { name: "Table 2", capacity: 6 }),
    );
  });

  // Le refus est montré, et en français : l'API répond en anglais, et son
  // message recopié tel quel était un défaut de l'interface.
  it("surfaces the API's capacity conflict in French instead of failing silently", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error('Table "Table 1" already seats 9 guest(s); its capacity cannot be lowered to 4'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/La table « Table 1 » n'a pas pu être modifiée/);
    expect(alerte).toHaveTextContent(/places déjà occupées/);
    expect(screen.queryByText(/already seats/i)).not.toBeInTheDocument();
  });

  it("refuses a capacity below one before sending anything", async () => {
    const postSpy = vi.spyOn(apiModule.api, "post").mockResolvedValue({});
    renderPage();

    fireEvent.change(await screen.findByLabelText(/nom de la table/i), { target: { value: "Table 2" } });
    fireEvent.change(screen.getByLabelText(/^capacité$/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /ajouter une table/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La capacité doit être d'au moins 1 place.");
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("says in French when a table could not be created", async () => {
    vi.spyOn(apiModule.api, "post").mockRejectedValue(new Error("name must be a string"));
    renderPage();

    fireEvent.change(await screen.findByLabelText(/nom de la table/i), { target: { value: "Table 2" } });
    fireEvent.click(screen.getByRole("button", { name: /ajouter une table/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/La table n'a pas pu être créée/);
    expect(screen.queryByText(/must be a string/)).not.toBeInTheDocument();
  });
});

describe("TablesPage states", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows skeletons while the plan loads, then the plan", async () => {
    let livrer: (valeur: TableDto[]) => void = () => {};
    vi.spyOn(apiModule.api, "get").mockImplementation((path: string) =>
      path === "/admin/tables"
        ? new Promise<TableDto[]>((resoudre) => (livrer = resoudre))
        : Promise.resolve(pageDe([])),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TablesPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Chargement du plan de table…");
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);

    livrer(TABLE_UNIQUE);
    expect(await screen.findByText(/Table 1 — 8 places/)).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("explains an empty plan instead of showing an empty board", async () => {
    renderPage({ tables: [] });
    expect(await screen.findByText("Aucune table")).toBeInTheDocument();
    expect(screen.getByText(/Créez la première table/)).toBeInTheDocument();
  });

  it("says in French when the plan could not be loaded", async () => {
    vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("Internal server error"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TablesPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/Le plan de table n'a pas pu être chargé/);
    expect(screen.queryByText(/Internal server error/)).not.toBeInTheDocument();
  });
});

describe("TablesPage placement", () => {
  afterEach(() => vi.restoreAllMocks());

  const foyerNonPlace: HouseholdAdminDto = {
    id: "n1",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: [],
    status: "PENDING",
    confirmedCount: null,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  function renderAvecUnFoyer() {
    const get = vi.spyOn(apiModule.api, "get").mockImplementation((path: string) =>
      Promise.resolve(path === "/admin/tables" ? TABLE_UNIQUE : pageDe([foyerNonPlace])),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TablesPage />
      </QueryClientProvider>,
    );
    return get;
  }

  async function placerALaTable1(utilisateur: ReturnType<typeof userEvent.setup>) {
    // Le foyer n'existe qu'une fois la réponse arrivée : c'est lui qu'on
    // attend, pas un titre rendu dès le premier passage.
    const foyer = within(await screen.findByRole("group", { name: "Rakotomavo" }));
    await utilisateur.click(foyer.getByRole("button", { name: "Placer à la table…" }));
    const option = within(screen.getByRole("dialog")).getByRole("button", { name: /table 1/i });
    // Le menu présentait ce placement comme permis : 8 places, 4 à placer.
    expect(option).toBeEnabled();
    await utilisateur.click(option);
  }

  it("seats a household through the menu and says so", async () => {
    const utilisateur = userEvent.setup();
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderAvecUnFoyer();

    await placerALaTable1(utilisateur);

    expect(patch).toHaveBeenCalledWith("/admin/tables/t1/assign/n1");
    expect(await screen.findByRole("status")).toHaveTextContent("Le foyer Rakotomavo est placé à la table « Table 1 ».");
  });

  // Le menu n'autorise rien : entre le chargement et le clic, un autre onglet a
  // pu remplir la table. Le serveur refuse — en anglais —, la page le dit en
  // français et recharge le plan pour montrer l'état réel.
  it("shows the server's refusal in French and refreshes the plan, even when the menu allowed it", async () => {
    const utilisateur = userEvent.setup();
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error('Table "Table 1" has 2 seat(s) left; this household needs 4'),
    );
    const get = renderAvecUnFoyer();
    await screen.findByRole("group", { name: "Rakotomavo" });
    const chargementsAvant = get.mock.calls.filter(([chemin]) => chemin === "/admin/tables").length;

    await placerALaTable1(utilisateur);

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/Le foyer Rakotomavo n'a pas pu être placé à la table « Table 1 »/);
    expect(alerte).toHaveTextContent(/plan vient d'être rechargé/);
    expect(screen.queryByText(/seat\(s\) left/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(get.mock.calls.filter(([chemin]) => chemin === "/admin/tables").length).toBeGreaterThan(
        chargementsAvant,
      ),
    );
  });
});

describe("TablesPage deletion guard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never deletes a table on the first click", async () => {
    const utilisateur = userEvent.setup();
    const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    renderPage({ tables: [table({ name: "Table 1" })] });

    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
    expect(supprimer).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("deletes only once the confirmation is pressed", async () => {
    const utilisateur = userEvent.setup();
    const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    renderPage({ tables: [table({ name: "Table 1" })] });

    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table" }));
    expect(supprimer).toHaveBeenCalledTimes(1);
  });

  it("cancels without deleting", async () => {
    const utilisateur = userEvent.setup();
    const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    renderPage({ tables: [table({ name: "Table 1" })] });

    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
    await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
    expect(supprimer).not.toHaveBeenCalled();
  });

  // Supprimer une table ne détruit pas les foyers : elle les renvoie aux non
  // placés. Le dire évite de croire qu'on perd des invités.
  it("says where the seated households go", async () => {
    const utilisateur = userEvent.setup();
    renderPage({
      tables: [table({ name: "Table 1", households: [foyerDeTable()] })],
    });

    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
    // Ce que le dialogue doit dire, quel que soit le nombre : les foyers ne
    // sont pas supprimés avec la table. L'accord lui-même est vérifié juste
    // en dessous, dans les deux cas.
    expect(
      screen.getByText(/aux foyers non placés\. Aucun foyer n'est supprimé\./),
    ).toBeInTheDocument();
  });

  // « Les 1 foyers placés à cette table » — la même faute que R14 a fait
  // corriger côté foyers, au mot près, dans le fichier voisin.
  it("agrees the noun with the number for a table seating one household", async () => {
    const utilisateur = userEvent.setup();
    renderPage({ tables: [table({ name: "Table 1", households: [foyerDeTable()] })] });

    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
    expect(screen.getByText(/^Le foyer placé à cette table reviendra/)).toBeInTheDocument();
  });

  it("keeps the plural for a table seating several", async () => {
    const utilisateur = userEvent.setup();
    renderPage({
      tables: [
        table({
          name: "Table 1",
          households: [foyerDeTable(), foyerDeTable({ id: "h2", displayName: "Andriamanana" })],
        }),
      ],
    });

    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
    expect(screen.getByText(/^Les 2 foyers placés à cette table reviendront/)).toBeInTheDocument();
  });
});

describe("TablesPage household list", () => {
  afterEach(() => vi.restoreAllMocks());

  const nonPlace: HouseholdAdminDto = {
    id: "n1",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: [],
    status: "PENDING",
    confirmedCount: null,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  function renderAvec(foyers: Page<HouseholdAdminDto>) {
    const get = vi.spyOn(apiModule.api, "get").mockImplementation((path: string) =>
      Promise.resolve(path === "/admin/tables" ? TABLE_UNIQUE : foyers),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TablesPage />
      </QueryClientProvider>,
    );
    return get;
  }

  // Les foyers non placés se déduisent de toute la liste : une page de 100
  // en ferait disparaître sans rien dire.
  it("asks for every household, up to the API's ceiling", async () => {
    const get = renderAvec(pageDe([nonPlace]));
    await screen.findByRole("group", { name: "Rakotomavo" });
    expect(get.mock.calls.map(([chemin]) => chemin)).toContain("/admin/households?limit=500");
  });

  it("warns that the plan is incomplete when the API holds more households than it sent", async () => {
    renderAvec(pageDe([nonPlace], 640));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Seuls les 1 premiers foyers sur 640 sont pris en compte : des foyers non placés peuvent manquer à la liste.",
    );
  });

  it("stays quiet when the whole list arrived", async () => {
    renderAvec(pageDe([nonPlace]));
    await screen.findByRole("group", { name: "Rakotomavo" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
