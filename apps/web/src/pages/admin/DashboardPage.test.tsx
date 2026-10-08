import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminSettingsDto, DashboardStatsDto, HouseholdAdminDto, Page, TableDto } from "@invitation-app/shared";
import { DashboardPage } from "./DashboardPage";
import * as apiModule from "@/lib/api";

function foyer(partiel: Partial<HouseholdAdminDto>): HouseholdAdminDto {
  return {
    id: "h1",
    displayName: "Famille Rakoto",
    allocatedSeats: 4,
    memberNames: [],
    status: "PENDING",
    confirmedCount: null,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partiel,
  };
}

function chiffres(partiel: Partial<DashboardStatsDto> = {}): DashboardStatsDto {
  return {
    totalHouseholds: 1,
    confirmedHouseholds: 0,
    declinedHouseholds: 0,
    pendingHouseholds: 1,
    totalConfirmedGuests: 0,
    dietaryNotesCount: 0,
    ...partiel,
  };
}

function parametres(partiel: Partial<AdminSettingsDto> = {}): AdminSettingsDto {
  return {
    weddingDate: "2027-01-02T06:00:00.000Z",
    venueName: "Espace Ny Akanintsika",
    address: "Antananarivo",
    mapUrl: null,
    dressCode: null,
    parkingInfo: null,
    rsvpDeadline: "2026-12-01T00:00:00.000Z",
    contactPhones: ["+261 34 64 314 02"],
    seatingPlanActivated: false,
    maxGuests: 180,
    ...partiel,
  };
}

type Chemin = "dashboard" | "settings" | "tables" | "households";

function renderPage({
  households = [foyer({})],
  total,
  stats = chiffres(),
  settings = parametres(),
  tables = [] as TableDto[],
  enAttente = [] as Chemin[],
  enErreur = [] as Chemin[],
}: {
  households?: HouseholdAdminDto[];
  /** Le `total` de l'enveloppe, s'il diffère du nombre de foyers renvoyés. */
  total?: number;
  stats?: DashboardStatsDto;
  settings?: AdminSettingsDto;
  tables?: TableDto[];
  enAttente?: Chemin[];
  enErreur?: Chemin[];
} = {}) {
  const get = vi.spyOn(apiModule.api, "get").mockImplementation((chemin: string) => {
    const quoi: Chemin = chemin.startsWith("/admin/households")
      ? "households"
      : (chemin.replace("/admin/", "") as Chemin);
    // Une promesse qui ne se résout jamais : le seul moyen d'observer l'état
    // de chargement sans dépendre d'un vrai délai réseau dans le test.
    if (enAttente.includes(quoi)) return new Promise<never>(() => {});
    // Le texte anglais que l'API renverrait : il ne doit jamais s'afficher.
    if (enErreur.includes(quoi)) return Promise.reject(new Error("Request failed with status 500"));
    if (quoi === "dashboard") return Promise.resolve(stats);
    if (quoi === "settings") return Promise.resolve(settings);
    if (quoi === "tables") return Promise.resolve(tables);
    const page: Page<HouseholdAdminDto> = { items: households, total: total ?? households.length, limit: 500, offset: 0 };
    return Promise.resolve(page);
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const vue = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...vue, get };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    // Seule l'horloge est figée : les promesses et les minuteurs restent vrais.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T09:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits with skeletons rather than with an empty screen", () => {
    renderPage({ enAttente: ["dashboard", "settings", "tables", "households"] });
    expect(screen.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement du tableau de bord…");
  });

  it("assembles the countdown, the overview, the two cards, the reminders and the words", async () => {
    renderPage({
      households: [
        foyer({ id: "p1", displayName: "Famille Ravelo", allocatedSeats: 5 }),
        foyer({
          id: "c1",
          displayName: "Famille Randria",
          status: "CONFIRMED",
          confirmedCount: 3,
          allocatedSeats: 3,
          message: "Mamie demande s'il y aura du romazava.",
        }),
      ],
      stats: chiffres({ totalHouseholds: 2, confirmedHouseholds: 1, pendingHouseholds: 1, totalConfirmedGuests: 3 }),
      tables: [{ id: "t1", name: "Table 1", capacity: 10, households: [] }],
    });

    expect(await screen.findByText("J−86")).toBeInTheDocument();
    expect(screen.getByText("avant la date limite du 1er décembre 2026, 1 foyer n'a pas encore répondu")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "3 invités confirmés" })).toBeInTheDocument();
    expect(screen.getByText("Encore 172 places à accorder avant le seuil de 180 invités")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Réponses" })).toBeInTheDocument();
    expect(await screen.findByText("1 table, 10 chaises")).toBeInTheDocument();
    const relance = within(screen.getByRole("region", { name: "À relancer" }));
    expect(relance.getAllByRole("listitem")).toHaveLength(1);
    expect(relance.getByText("Famille Ravelo")).toBeInTheDocument();
    const mots = within(screen.getByRole("region", { name: "Mots des invités" }));
    expect(mots.getByText(/romazava/)).toBeInTheDocument();
  });

  // La capture du commanditaire : un seuil dépassé se dit, en mots.
  it("takes the threshold from the settings", async () => {
    renderPage({
      households: [foyer({ allocatedSeats: 50 })],
      settings: parametres({ maxGuests: 40 }),
    });
    expect(await screen.findByText("10 places prévues au-delà du seuil de 40 invités")).toBeInTheDocument();
    expect(screen.getByText("Seuil max · 40")).toBeInTheDocument();
  });

  it("shows no threshold when the settings have none", async () => {
    renderPage({ settings: parametres({ maxGuests: null }) });
    await screen.findByRole("heading", { name: /confirmé/ });
    expect(screen.queryByText(/seuil/i)).toBeNull();
  });

  describe("chaque carte tombe seule, et le dit en français", () => {
    // Le plan de table est une requête à part : son échec ne prend rien d'autre avec lui.
    it("keeps everything else when only the tables fail", async () => {
      renderPage({ enErreur: ["tables"] });
      expect(await screen.findByRole("alert")).toHaveTextContent("Le plan de table n'a pas pu être chargé.");
      expect(await screen.findByText("J−86")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Réponses" })).toBeInTheDocument();
      expect(within(screen.getByRole("region", { name: "À relancer" })).getAllByRole("listitem")).toHaveLength(1);
    });

    it("keeps the overview, without a threshold, when only the settings fail", async () => {
      renderPage({ enErreur: ["settings"] });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Les dates du mariage n'ont pas pu être chargées.",
      );
      expect(await screen.findByRole("heading", { name: /confirmé/ })).toBeInTheDocument();
    });

    it("never shows the API's English when everything fails", async () => {
      renderPage({ enErreur: ["dashboard", "settings", "tables", "households"] });
      // Six cartes, six alertes : bandeau, bilan, réponses, plan, relance, mots.
      await vi.waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(6));
      expect(document.body).not.toHaveTextContent(/Request failed|status 500/);
      expect(screen.getByText("Le bilan des invités n'a pas pu être chargé.")).toBeInTheDocument();
      expect(screen.getByText("Les réponses n'ont pas pu être chargées.")).toBeInTheDocument();
      expect(screen.getByText("La liste des foyers n'a pas pu être chargée.")).toBeInTheDocument();
    });
  });

  describe("toute la liste, ou un avertissement", () => {
    // Les places prévues se somment sur tous les foyers, au plafond de l'API.
    it("asks for every household, up to the API's ceiling", async () => {
      const { get } = renderPage();
      await screen.findByText("Famille Rakoto");
      const chemins = get.mock.calls.map(([chemin]) => chemin as string);
      expect(chemins).toContain("/admin/households?limit=500");
    });

    it("says the figures are incomplete when the API holds more households than it sent", async () => {
      renderPage({ households: [foyer({ id: "a" })], total: 612 });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Seuls les 1 premiers foyers sur 612 sont pris en compte : les chiffres affichés sont incomplets.",
      );
    });

    it("stays quiet when the whole list arrived", async () => {
      renderPage();
      await screen.findByText("Famille Rakoto");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
