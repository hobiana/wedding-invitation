import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TableDto } from "@invitation-app/shared";
import { TablesPage } from "./TablesPage";
import * as apiModule from "@/lib/api";

const tables: TableDto[] = [
  { id: "t1", name: "Table 1", capacity: 8, households: [] },
];

function renderPage() {
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

  // DELETE /admin/tables/:id was likewise unreachable.
  it("deletes a table", async () => {
    const deleteSpy = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /supprimer/i }));

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
