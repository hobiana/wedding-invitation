import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DashboardStatsDto, HouseholdAdminDto } from "@invitation-app/shared";
import { DashboardPage, partEnPourcent } from "./DashboardPage";
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

function chiffres(partiel: Partial<DashboardStatsDto>): DashboardStatsDto {
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

function renderPage({
  households = [foyer({})],
  stats = chiffres({}),
  pending = false,
  enErreur = false,
}: {
  households?: HouseholdAdminDto[];
  stats?: DashboardStatsDto;
  pending?: boolean;
  enErreur?: boolean;
} = {}) {
  vi.spyOn(apiModule.api, "get").mockImplementation((chemin: string) => {
    // Une promesse qui ne se résout jamais : le seul moyen d'observer l'état
    // de chargement sans dépendre d'un vrai délai réseau dans le test.
    if (pending) return new Promise<never>(() => {});
    if (enErreur) return Promise.reject(new Error("Request failed with status 500"));
    return Promise.resolve(chemin === "/admin/dashboard" ? stats : households);
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

/**
 * La section « À relancer », une fois ses lignes arrivées.
 *
 * Attendre la section elle-même ne suffirait pas : son titre est rendu dès le
 * premier passage, pendant le chargement, donc `findByRole("region")` rend la
 * main avant que la requête ait répondu et les assertions porteraient sur des
 * squelettes. On attend donc une ligne, qui n'existe qu'avec des données.
 */
async function sectionRelance() {
  const section = within(screen.getByRole("region", { name: "À relancer" }));
  await section.findAllByRole("listitem");
  return section;
}

describe("DashboardPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("waits with skeletons rather than with an empty screen", () => {
    renderPage({ pending: true });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement du tableau de bord…");
  });

  it("says so in French when the dashboard cannot be loaded", async () => {
    renderPage({ enErreur: true });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Le tableau de bord n'a pas pu être chargé/,
    );
  });

  describe("les rapports", () => {
    // « 38 foyers sur 62 ont répondu » — une phrase, pas un nombre nu.
    it("reports the answers as a sentence rather than as a bare number", async () => {
      renderPage({
        stats: chiffres({
          totalHouseholds: 62,
          confirmedHouseholds: 31,
          declinedHouseholds: 7,
          pendingHouseholds: 24,
        }),
      });
      expect(await screen.findByText("38 foyers sur 62 ont répondu")).toBeInTheDocument();
    });

    // « 1 foyers ont répondu » est une faute dans une interface qui est en
    // français sans exception — et le premier foyer qui répond la produit.
    it("agrees the sentence with a single answer", async () => {
      renderPage({
        stats: chiffres({
          totalHouseholds: 62,
          confirmedHouseholds: 1,
          declinedHouseholds: 0,
          pendingHouseholds: 61,
        }),
      });
      expect(await screen.findByText("1 foyer sur 62 a répondu")).toBeInTheDocument();
    });

    // Le total des places prévues n'est pas au contrat : il se somme ici, sur
    // la liste des foyers que la page charge déjà.
    it("sums the allocated seats itself for the caterer's number", async () => {
      renderPage({
        households: [
          foyer({ id: "a", allocatedSeats: 4 }),
          foyer({ id: "b", allocatedSeats: 6 }),
          foyer({ id: "c", allocatedSeats: 2 }),
        ],
        stats: chiffres({ totalConfirmedGuests: 7 }),
      });
      expect(await screen.findByText("7 places confirmées sur 12 prévues")).toBeInTheDocument();
    });

    it("counts the dietary notes the caterer has to cook for", async () => {
      renderPage({ stats: chiffres({ dietaryNotesCount: 7 }) });
      expect(await screen.findByText("7 régimes particuliers")).toBeInTheDocument();
    });

    it("agrees the dietary wording with a single note", async () => {
      renderPage({ stats: chiffres({ dietaryNotesCount: 1 }) });
      expect(await screen.findByText("1 régime particulier")).toBeInTheDocument();
    });

    // La grande table de foyers faisait doublon avec l'écran Foyers : elle
    // part. Un foyer qui a répondu n'a plus rien à faire sur cet écran.
    it("no longer duplicates the households table of the Foyers screen", async () => {
      renderPage({
        households: [foyer({ displayName: "Famille Rakoto", status: "CONFIRMED", confirmedCount: 3 })],
        stats: chiffres({ totalHouseholds: 1, confirmedHouseholds: 1, pendingHouseholds: 0 }),
      });
      // On attend un contenu que seule la réponse produit : le titre de la
      // section, lui, est déjà là pendant le chargement, et s'y accrocher
      // ferait passer le test sur un écran encore vide.
      await screen.findByText("Aucun foyer en attente");
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.queryByText("Famille Rakoto")).toBeNull();
    });
  });

  describe("à relancer", () => {
    it("lists only the households that have not answered", async () => {
      renderPage({
        households: [
          foyer({ id: "c1", displayName: "Famille Confirmée", status: "CONFIRMED", confirmedCount: 2 }),
          foyer({ id: "d1", displayName: "Famille Déclinée", status: "DECLINED", confirmedCount: 0 }),
          foyer({ id: "p1", displayName: "Famille Silencieuse", status: "PENDING" }),
        ],
        stats: chiffres({ totalHouseholds: 3, confirmedHouseholds: 1, declinedHouseholds: 1, pendingHouseholds: 1 }),
      });

      const section = await sectionRelance();
      expect(section.getAllByRole("listitem")).toHaveLength(1);
      expect(section.getByText("Famille Silencieuse")).toBeInTheDocument();
    });

    // « Les plus anciens d'abord » = `createdAt` croissant. Pas `updatedAt`,
    // qui bouge à chaque correction faite depuis l'admin et ferait remonter
    // un foyer qu'on vient tout juste de modifier.
    it("puts the household waiting the longest first", async () => {
      renderPage({
        households: [
          foyer({ id: "b", displayName: "Foyer du milieu", createdAt: "2026-02-01T00:00:00.000Z" }),
          foyer({ id: "c", displayName: "Foyer récent", createdAt: "2026-03-01T00:00:00.000Z" }),
          foyer({
            id: "a",
            displayName: "Foyer le plus ancien",
            createdAt: "2026-01-01T00:00:00.000Z",
            // `updatedAt` très récent : s'il servait de clé de tri, ce foyer
            // tomberait en dernier alors qu'il attend depuis le plus longtemps.
            updatedAt: "2026-09-01T00:00:00.000Z",
          }),
        ],
        stats: chiffres({ totalHouseholds: 3, pendingHouseholds: 3 }),
      });

      const section = await sectionRelance();
      const noms = section.getAllByRole("listitem").map((ligne) => ligne.textContent);
      expect(noms[0]).toContain("Foyer le plus ancien");
      expect(noms[1]).toContain("Foyer du milieu");
      expect(noms[2]).toContain("Foyer récent");
    });

    // `confirmedCount` reste `null` tant que le foyer n'a pas répondu. « 0 »
    // dirait « personne ne vient » : c'est le bug revenu trois fois.
    it("shows an em dash, never a zero, for a household that has not answered", async () => {
      renderPage({ households: [foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 4 })] });
      expect(await screen.findByText(/Places : — \/ 4/)).toBeInTheDocument();
      expect(screen.queryByText(/Places : 0 \/ 4/)).toBeNull();
    });

    // L'information et le geste qu'elle appelle au même endroit.
    it("offers the copy gesture beside each household to chase", async () => {
      renderPage({
        households: [foyer({ id: "aZ3k9Lm2", displayName: "Rakotomavo", status: "PENDING" })],
      });
      expect(
        await screen.findByRole("button", { name: /Copier le lien de Rakotomavo/ }),
      ).toBeInTheDocument();
    });

    // Deux vides, deux phrases : « personne à relancer » est une bonne
    // nouvelle, « aucun foyer saisi » est un travail qui reste à faire.
    it("distinguishes an empty guest list from a list where everybody answered", async () => {
      renderPage({
        households: [],
        stats: chiffres({ totalHouseholds: 0, pendingHouseholds: 0 }),
      });
      expect(await screen.findByText("Aucun foyer")).toBeInTheDocument();
    });

    it("celebrates the moment nobody is left to chase", async () => {
      renderPage({
        households: [foyer({ displayName: "Famille Rakoto", status: "CONFIRMED", confirmedCount: 3 })],
        stats: chiffres({ totalHouseholds: 1, confirmedHouseholds: 1, pendingHouseholds: 0 }),
      });
      expect(await screen.findByText("Aucun foyer en attente")).toBeInTheDocument();
    });
  });

  // La jauge est un remplissage statique — elle n'anime pas, l'admin n'anime
  // rien. Reste la division, qui tombe sur un dépôt fraîchement installé.
  describe("partEnPourcent", () => {
    it("returns zero rather than NaN before any household exists", () => {
      expect(partEnPourcent(0, 0)).toBe(0);
    });

    it("never overflows the bar when the two counts disagree", () => {
      expect(partEnPourcent(12, 10)).toBe(100);
    });

    it("gives the share of the whole", () => {
      expect(partEnPourcent(31, 62)).toBe(50);
    });
  });
});
