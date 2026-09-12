import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
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

function renderPage({ tables = TABLE_UNIQUE }: { tables?: TableDto[] } = {}) {
  vi.spyOn(apiModule.api, "get").mockImplementation((path: string) =>
    Promise.resolve(path === "/admin/tables" ? tables : []),
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

  it("surfaces the API's capacity conflict instead of failing silently", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error('Table "Table 1" already seats 9 guest(s); its capacity cannot be lowered to 4'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText(/already seats 9 guest/i)).toBeInTheDocument();
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
