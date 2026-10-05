import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminSettingsDto, HouseholdAdminDto, Page, TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { ToastProvider } from "@/components/ui/toast";
import { TablesPage } from "./TablesPage";
import * as apiModule from "@/lib/api";

/**
 * La page rend **soit** le bureau **soit** le téléphone. jsdom n'a pas de
 * `matchMedia` : sans ce réglage, `useMediaQuery` répond « non » et chaque
 * test serait un test de téléphone sans le dire.
 */
const matchMediaOriginal = window.matchMedia;
function ecran(bureau: boolean) {
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
}
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
  vi.restoreAllMocks();
});

function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t1", name: "Table 1", capacity: 8, households: [], ...partiel };
}
function resume(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "a1", displayName: "Rakotomavo", allocatedSeats: 4, confirmedCount: null, status: "PENDING", ...partiel };
}
function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
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
    ...partiel,
  };
}
function pageDe(items: HouseholdAdminDto[], total = items.length): Page<HouseholdAdminDto> {
  return { items, total, limit: 500, offset: 0 };
}
const REGLAGES = { weddingDate: "2027-01-02T06:00:00.000Z" } as AdminSettingsDto;

interface Donnees {
  tables?: TableDto[];
  foyers?: Page<HouseholdAdminDto>;
  reglages?: AdminSettingsDto | Error;
}
function rendre({ tables = [table()], foyers = pageDe([]), reglages = REGLAGES }: Donnees = {}) {
  const get = vi.spyOn(apiModule.api, "get").mockImplementation((path: string) => {
    if (path === "/admin/tables") return Promise.resolve(tables);
    if (path === "/admin/settings") return reglages instanceof Error ? Promise.reject(reglages) : Promise.resolve(reglages);
    return Promise.resolve(foyers);
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TablesPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { get, utilisateur: userEvent.setup() };
}
const chargementsDesTables = (get: ReturnType<typeof rendre>["get"]) =>
  get.mock.calls.filter(([chemin]) => chemin === "/admin/tables").length;

describe("TablesPage on a desktop — header", () => {
  beforeEach(() => ecran(true));

  it("labels the reception with the wedding day, at Madagascar's time", async () => {
    rendre();
    expect(await screen.findByText("Réception · 2 janvier")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Plan de table" })).toBeInTheDocument();
  });

  // Les réglages ne chargent pas : l'étiquette manque, le plan reste utilisable.
  it("still shows the plan when the settings could not be loaded", async () => {
    rendre({ reglages: new Error("boom") });
    expect(await screen.findByRole("region", { name: "Table 1" })).toBeInTheDocument();
    expect(screen.queryByText(/Réception/)).not.toBeInTheDocument();
  });

  it("adds up the seats assigned and the households left to seat", async () => {
    rendre({
      tables: [table({ capacity: 8, households: [resume({ id: "s", allocatedSeats: 3 })] }), table({ id: "t2", name: "Table 2", capacity: 6 })],
      foyers: pageDe([foyer({ id: "s" }), foyer({ id: "x", displayName: "Rabe" }), foyer({ id: "y", displayName: "Andria" })]),
    });
    // `<dt>` puis `<dd>` dans le DOM ; l'ordre visuel est inversé par le style.
    expect((await screen.findByText("places attribuées")).nextElementSibling).toHaveTextContent(/^3 \/ 14$/);
    expect(screen.getByText("foyers à placer").nextElementSibling).toHaveTextContent(/^2$/);
  });
});

describe("TablesPage on a desktop — households", () => {
  beforeEach(() => ecran(true));

  it("asks for every household, up to the API's ceiling", async () => {
    const { get } = rendre({ foyers: pageDe([foyer()]) });
    await screen.findByRole("group", { name: "Rakotomavo" });
    expect(get.mock.calls.map(([chemin]) => chemin)).toContain("/admin/households?limit=500");
  });

  // Décision du commanditaire : un foyer qui a décliné ne se place pas. Assis
  // avant son refus, il reste visible à sa table.
  it("hides a declined household from « À placer » but keeps it at its table", async () => {
    rendre({
      tables: [table({ households: [resume({ id: "assis", displayName: "Famille Rabe", status: "DECLINED", confirmedCount: 0 })] })],
      foyers: pageDe([
        foyer({ id: "assis", displayName: "Famille Rabe", status: "DECLINED", confirmedCount: 0 }),
        foyer({ id: "non", displayName: "Famille Morel", status: "DECLINED", confirmedCount: 0 }),
        foyer({ id: "oui", displayName: "Famille Girard" }),
      ]),
    });
    expect(await screen.findByRole("group", { name: "Famille Girard" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Famille Morel" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Table 1" })).getByText("Famille Rabe")).toBeInTheDocument();
  });

  it("warns that the plan is incomplete when the API holds more households than it sent", async () => {
    rendre({ foyers: pageDe([foyer()], 640) });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Seuls les 1 premiers foyers sur 640 sont pris en compte : des foyers non placés peuvent manquer à la liste.",
    );
  });

  it("stays quiet when the whole list arrived", async () => {
    rendre({ foyers: pageDe([foyer()]) });
    await screen.findByRole("group", { name: "Rakotomavo" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TablesPage on a desktop — placing", () => {
  beforeEach(() => ecran(true));

  async function placerALaTable1(utilisateur: ReturnType<typeof userEvent.setup>) {
    // Le foyer n'existe qu'une fois la réponse arrivée : c'est lui qu'on attend.
    await utilisateur.click(await screen.findByRole("button", { name: "Placer Rakotomavo" }));
    await utilisateur.click(screen.getByRole("button", { name: "Placer ici, à la table « Table 1 »" }));
  }

  it("seats a household and confirms it in a toast", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre({ foyers: pageDe([foyer()]) });
    await placerALaTable1(utilisateur);
    expect(patch).toHaveBeenCalledWith("/admin/tables/t1/assign/n1");
    expect(await screen.findByText("Le foyer Rakotomavo est placé à la table « Table 1 ».")).toBeInTheDocument();
  });

  // Le serveur refuse — en anglais. La page le dit en français et recharge.
  it("shows the server's refusal in French and refreshes the plan", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(new Error('Table "Table 1" has 2 seat(s) left; this household needs 4'));
    const { utilisateur, get } = rendre({ foyers: pageDe([foyer()]) });
    await screen.findByRole("group", { name: "Rakotomavo" });
    const avant = chargementsDesTables(get);

    await placerALaTable1(utilisateur);

    expect(
      await screen.findByText(
        "Le foyer Rakotomavo n'a pas pu être placé à la table « Table 1 » : elle n'a sans doute plus assez de places. Le plan vient d'être rechargé.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/seat\(s\) left/)).not.toBeInTheDocument();
    await waitFor(() => expect(chargementsDesTables(get)).toBeGreaterThan(avant));
  });

  it("removes a household from its table and says where it went", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre({
      tables: [table({ households: [resume({ id: "n1" })] })],
      foyers: pageDe([foyer()]),
    });
    await utilisateur.click(await screen.findByRole("button", { name: "Retirer Rakotomavo de la table « Table 1 »" }));
    expect(patch).toHaveBeenCalledWith("/admin/tables/unassign/n1");
    expect(
      await screen.findByText("Le foyer Rakotomavo est retiré de la table « Table 1 » et revient dans À placer."),
    ).toBeInTheDocument();
  });

  // Un foyer décliné ne revient pas dans « À placer » : le toast ne le promet pas.
  it("does not promise « À placer » to a declined household", async () => {
    vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre({
      tables: [table({ households: [resume({ id: "n1", status: "DECLINED", confirmedCount: 0 })] })],
      foyers: pageDe([foyer({ status: "DECLINED", confirmedCount: 0 })]),
    });
    await utilisateur.click(await screen.findByRole("button", { name: "Retirer Rakotomavo de la table « Table 1 »" }));
    expect(await screen.findByText("Le foyer Rakotomavo est retiré de la table « Table 1 ».")).toBeInTheDocument();
  });

  it("says in French when a household could not be removed", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(new Error("Household not found"));
    const { utilisateur } = rendre({ tables: [table({ households: [resume({ id: "n1" })] })], foyers: pageDe([foyer()]) });
    await utilisateur.click(await screen.findByRole("button", { name: "Retirer Rakotomavo de la table « Table 1 »" }));
    expect(
      await screen.findByText("Le foyer Rakotomavo n'a pas pu être retiré de sa table. Le plan vient d'être rechargé."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not found/)).not.toBeInTheDocument();
  });
});

describe("TablesPage on a desktop — tables", () => {
  beforeEach(() => ecran(true));

  it("creates a table from the draft and confirms it", async () => {
    const post = vi.spyOn(apiModule.api, "post").mockResolvedValue({});
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(post).toHaveBeenCalledWith("/admin/tables", { name: "Table 2", capacity: 10 });
    expect(await screen.findByText("La table « Table 2 » est créée.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("form", { name: "Nouvelle table" })).not.toBeInTheDocument());
  });

  it("says in French when a table could not be created, keeping the draft", async () => {
    vi.spyOn(apiModule.api, "post").mockRejectedValue(new Error("name must be a string"));
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(await screen.findByText(/La table n'a pas pu être créée/)).toBeInTheDocument();
    expect(screen.queryByText(/must be a string/)).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Nouvelle table" })).toBeInTheDocument();
  });

  it("renames a table and changes its capacity", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("button", { name: "Modifier la table « Table 1 »" }));
    const nom = screen.getByLabelText("Nom");
    await utilisateur.clear(nom);
    await utilisateur.type(nom, "Table des amis");
    await utilisateur.click(screen.getByRole("button", { name: "Ajouter une place" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(patch).toHaveBeenCalledWith("/admin/tables/t1", { name: "Table des amis", capacity: 9 });
    expect(await screen.findByText("La table « Table des amis » est modifiée.")).toBeInTheDocument();
  });

  it("surfaces the API's capacity conflict in French", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error('Table "Table 1" already seats 9 guest(s); its capacity cannot be lowered to 4'),
    );
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("button", { name: "Modifier la table « Table 1 »" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(await screen.findByText(/La table « Table 1 » n'a pas pu être modifiée/)).toBeInTheDocument();
    expect(screen.queryByText(/already seats/i)).not.toBeInTheDocument();
  });
});

describe("TablesPage on a desktop — deleting", () => {
  beforeEach(() => ecran(true));

  async function demanderLaSuppression(tables: TableDto[] = [table()]) {
    const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    const vue = rendre({ tables });
    await vue.utilisateur.click(await screen.findByRole("button", { name: "Modifier la table « Table 1 »" }));
    await vue.utilisateur.click(screen.getByRole("button", { name: "Supprimer" }));
    return { ...vue, supprimer };
  }

  it("never deletes a table on the first click", async () => {
    const { supprimer } = await demanderLaSuppression();
    expect(supprimer).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("deletes once the confirmation is pressed, and confirms it", async () => {
    const { supprimer, utilisateur } = await demanderLaSuppression();
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table" }));
    expect(supprimer).toHaveBeenCalledWith("/admin/tables/t1");
    expect(await screen.findByText("La table « Table 1 » est supprimée.")).toBeInTheDocument();
  });

  it("cancels without deleting", async () => {
    const { supprimer, utilisateur } = await demanderLaSuppression();
    await utilisateur.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Annuler" }));
    expect(supprimer).not.toHaveBeenCalled();
  });

  // Supprimer une table ne détruit pas les foyers : ils reviennent dans « À placer ».
  it("says the one household seated there goes back to « À placer »", async () => {
    await demanderLaSuppression([table({ households: [resume()] })]);
    expect(
      screen.getByText("Le foyer placé à cette table reviendra dans À placer. Aucun foyer n'est supprimé."),
    ).toBeInTheDocument();
  });

  it("keeps the plural for a table seating several", async () => {
    await demanderLaSuppression([table({ households: [resume(), resume({ id: "h2", displayName: "Andriamanana" })] })]);
    expect(screen.getByText(/^Les 2 foyers placés à cette table reviendront dans À placer\./)).toBeInTheDocument();
  });

  it("says in French when a table could not be deleted", async () => {
    vi.spyOn(apiModule.api, "delete").mockRejectedValue(new Error("Internal server error"));
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("button", { name: "Modifier la table « Table 1 »" }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer" }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table" }));
    expect(await screen.findByText("La table « Table 1 » n'a pas pu être supprimée. Réessayez dans un instant.")).toBeInTheDocument();
    expect(screen.queryByText(/Internal server error/)).not.toBeInTheDocument();
  });
});

describe("TablesPage states", () => {
  beforeEach(() => ecran(true));

  it("shows skeletons while the plan loads, then the plan", async () => {
    let livrer: (valeur: TableDto[]) => void = () => {};
    vi.spyOn(apiModule.api, "get").mockImplementation((path: string) =>
      path === "/admin/tables" ? new Promise<TableDto[]>((resoudre) => (livrer = resoudre)) : Promise.resolve(pageDe([])),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TablesPage />
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Chargement du plan de table…")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);

    livrer([table()]);
    expect(await screen.findByRole("region", { name: "Table 1" })).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("says in French when the plan could not be loaded", async () => {
    vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("Internal server error"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TablesPage />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/Le plan de table n'a pas pu être chargé/);
    expect(screen.queryByText(/Internal server error/)).not.toBeInTheDocument();
  });
});

/**
 * Le téléphone : les composants sont testés chacun à côté de leur fichier ;
 * ici, seulement que la page les branche sur les bonnes requêtes et les bons
 * toasts, et qu'elle ne rend qu'un écran à la fois.
 */
describe("TablesPage on a phone", () => {
  beforeEach(() => ecran(false));

  it("renders the phone plan alone, with its tabs", async () => {
    rendre({ foyers: pageDe([foyer()]) });
    // L'onglet n'apparaît qu'avec le plan chargé, compte compris.
    expect(await screen.findByRole("tab", { name: "À placer · 1" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("heading", { level: 1, name: "Plan de table" })).toHaveLength(1);
    expect(screen.queryByText("Glissez un foyer sur une table, ou cliquez-le puis choisissez sa table.")).toBeNull();
  });

  it("hides a declined household from « À placer »", async () => {
    rendre({
      foyers: pageDe([
        foyer({ id: "non", displayName: "Famille Morel", status: "DECLINED", confirmedCount: 0 }),
        foyer({ id: "oui", displayName: "Famille Girard" }),
      ]),
    });
    expect(await screen.findByRole("group", { name: "Famille Girard" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Famille Morel" })).not.toBeInTheDocument();
  });

  it("seats a household through the sheet, and confirms it in a toast", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre({ foyers: pageDe([foyer()]) });
    await utilisateur.click(await screen.findByRole("button", { name: "Placer Rakotomavo" }));
    await utilisateur.click(within(screen.getByRole("dialog", { name: "Rakotomavo" })).getByRole("button", { name: /^Table 1/ }));
    expect(patch).toHaveBeenCalledWith("/admin/tables/t1/assign/n1");
    expect(await screen.findByText("Le foyer Rakotomavo est placé à la table « Table 1 ».")).toBeInTheDocument();
  });

  it("shows the server's refusal in French", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(new Error('Table "Table 1" has 2 seat(s) left; this household needs 4'));
    const { utilisateur } = rendre({ foyers: pageDe([foyer()]) });
    await utilisateur.click(await screen.findByRole("button", { name: "Placer Rakotomavo" }));
    await utilisateur.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Table 1/ }));
    expect(await screen.findByText(/Le foyer Rakotomavo n'a pas pu être placé à la table « Table 1 »/)).toBeInTheDocument();
    expect(screen.queryByText(/seat\(s\) left/)).not.toBeInTheDocument();
  });

  it("removes a household from its table", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre({ tables: [table({ households: [resume({ id: "n1" })] })], foyers: pageDe([foyer()]) });
    await utilisateur.click(await screen.findByRole("tab", { name: "Tables · 1" }));
    await utilisateur.click(screen.getByRole("button", { name: /^Table 1/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Retirer Rakotomavo de la table « Table 1 »" }));
    expect(patch).toHaveBeenCalledWith("/admin/tables/unassign/n1");
    expect(
      await screen.findByText("Le foyer Rakotomavo est retiré de la table « Table 1 » et revient dans À placer."),
    ).toBeInTheDocument();
  });

  it("creates a table, and confirms it", async () => {
    const post = vi.spyOn(apiModule.api, "post").mockResolvedValue({});
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("tab", { name: "Tables · 1" }));
    await utilisateur.click(screen.getByRole("button", { name: "Nouvelle table" }));
    await utilisateur.click(screen.getByRole("button", { name: "Terminé" }));
    expect(post).toHaveBeenCalledWith("/admin/tables", { name: "Table 2", capacity: 10 });
    expect(await screen.findByText("La table « Table 2 » est créée.")).toBeInTheDocument();
  });

  it("changes a table's capacity, and confirms it", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("tab", { name: "Tables · 1" }));
    await utilisateur.click(screen.getByRole("button", { name: /^Table 1/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Ajouter une place" }));
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer la capacité" }));
    expect(patch).toHaveBeenCalledWith("/admin/tables/t1", { name: "Table 1", capacity: 9 });
    expect(await screen.findByText("La table « Table 1 » est modifiée.")).toBeInTheDocument();
  });

  it("deletes a table behind the page's confirmation", async () => {
    const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
    const { utilisateur } = rendre();
    await utilisateur.click(await screen.findByRole("tab", { name: "Tables · 1" }));
    await utilisateur.click(screen.getByRole("button", { name: /^Table 1/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer la table « Table 1 »" }));
    expect(supprimer).not.toHaveBeenCalled();
    await utilisateur.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Supprimer la table" }));
    expect(supprimer).toHaveBeenCalledWith("/admin/tables/t1");
    expect(await screen.findByText("La table « Table 1 » est supprimée.")).toBeInTheDocument();
  });

  it("shows skeletons under the title while the plan loads", () => {
    vi.spyOn(apiModule.api, "get").mockImplementation(() => new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TablesPage />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement du plan de table…")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1, name: "Plan de table" })).toBeInTheDocument();
  });

  it("says in French when the plan could not be loaded", async () => {
    vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("Internal server error"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TablesPage />
        </ToastProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/Le plan de table n'a pas pu être chargé/);
    expect(screen.queryByText(/Internal server error/)).not.toBeInTheDocument();
  });
});

