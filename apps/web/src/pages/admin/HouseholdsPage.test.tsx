import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { HouseholdAdminDto, Page } from "@invitation-app/shared";
import { HouseholdsPage } from "./HouseholdsPage";
import * as apiModule from "@/lib/api";

function foyer(partiel: Partial<HouseholdAdminDto>): HouseholdAdminDto {
  return {
    id: "h1",
    displayName: "Famille Rakoto",
    allocatedSeats: 4,
    memberNames: [],
    status: "CONFIRMED",
    confirmedCount: 3,
    dietaryNotes: "Deux repas végétariens",
    message: "Hâte d'y être !",
    tableId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partiel,
  };
}

const UN_FOYER: HouseholdAdminDto[] = [foyer({})];

/** « Foyer 01 » … « Foyer 30 », un id par foyer. */
function foyersNumerotes(n: number): HouseholdAdminDto[] {
  return Array.from({ length: n }, (_, i) => {
    const numero = String(i + 1).padStart(2, "0");
    return foyer({ id: `f${numero}`, displayName: `Foyer ${numero}`, dietaryNotes: `Note ${numero}` });
  });
}

function parametres(chemin: string): URLSearchParams {
  return new URL(chemin, "http://x").searchParams;
}

/**
 * Un faux serveur qui pagine et filtre pour de vrai : les tests regardent ce
 * qui s'affiche, pas seulement ce qui part. Le tri est celui du tableau reçu —
 * c'est l'API qui trie, et ses propres tests le vérifient.
 */
function serveur(foyers: HouseholdAdminDto[]) {
  return (chemin: string): Promise<Page<HouseholdAdminDto>> => {
    const p = parametres(chemin);
    const q = (p.get("q") ?? "").toLowerCase();
    const statut = p.get("status");
    const limit = Number(p.get("limit") ?? 100);
    const offset = Number(p.get("offset") ?? 0);
    const retenus = foyers.filter(
      (f) => (!q || f.displayName.toLowerCase().includes(q)) && (!statut || f.status === statut),
    );
    return Promise.resolve({ items: retenus.slice(offset, offset + limit), total: retenus.length, limit, offset });
  };
}

/** jsdom n'a pas `matchMedia` : sans lui, `useMediaQuery` répond « téléphone ». */
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

function renderPage({
  households = UN_FOYER,
  pending = false,
  get,
}: {
  households?: HouseholdAdminDto[];
  pending?: boolean;
  get?: (chemin: string) => Promise<unknown>;
} = {}) {
  const espion = vi.spyOn(apiModule.api, "get").mockImplementation(
    (get ??
      ((chemin: string) =>
        // Une promesse qui ne se résout jamais : le seul moyen d'observer l'état
        // de chargement sans dépendre d'un vrai délai réseau dans le test.
        pending ? new Promise<never>(() => {}) : serveur(households)(chemin))) as typeof apiModule.api.get,
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const vue = render(
    <QueryClientProvider client={queryClient}>
      <HouseholdsPage />
    </QueryClientProvider>,
  );
  return { ...vue, get: espion };
}

/** Les chemins demandés à la liste, dans l'ordre. */
function demandes(get: ReturnType<typeof renderPage>["get"]): URLSearchParams[] {
  return get.mock.calls
    .map(([chemin]) => chemin as string)
    .filter((chemin) => chemin.startsWith("/admin/households"))
    .map(parametres);
}

function derniereDemande(get: ReturnType<typeof renderPage>["get"]): URLSearchParams {
  const toutes = demandes(get);
  return toutes[toutes.length - 1];
}

type Utilisateur = ReturnType<typeof userEvent.setup>;

/** Ouvre le « … » d'un foyer et choisit une action. Le menu l'exécute une fois refermé. */
async function viaLeMenu(utilisateur: Utilisateur, nom: string, action: "Modifier" | "Supprimer") {
  await utilisateur.click(screen.getByRole("button", { name: `Actions pour ${nom}` }));
  await utilisateur.click(await screen.findByRole("menuitem", { name: action }));
}

beforeEach(() => ecran(true));
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("HouseholdsPage", () => {
  it("waits with skeletons rather than with an empty screen", () => {
    // Requête qui ne répond pas : l'écran doit montrer l'attente, pas du vide.
    renderPage({ pending: true });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement des foyers…");
  });

  it("shows the dietary notes and message a guest submitted", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Détail de Famille Rakoto/ }));
    expect(screen.getByText("Deux repas végétariens")).toBeInTheDocument();
    expect(screen.getByText("Hâte d'y être !")).toBeInTheDocument();
  });

  it("says in French when the list could not be loaded", async () => {
    renderPage({ get: () => Promise.reject(new Error("Internal server error")) });
    expect(await screen.findByRole("alert")).toHaveTextContent(/La liste des foyers n'a pas pu être chargée/);
    expect(screen.queryByText(/Internal server error/)).toBeNull();
  });

  describe("header", () => {
    it("counts the households the server holds", async () => {
      renderPage({ households: foyersNumerotes(30) });
      expect(await screen.findByText("30 foyers")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Foyers invités" })).toBeInTheDocument();
    });

    it("agrees the count with a single household", async () => {
      renderPage();
      expect(await screen.findByText("1 foyer")).toBeInTheDocument();
    });

    it("says how many were found once a filter is on", async () => {
      const utilisateur = userEvent.setup();
      renderPage({
        households: [
          foyer({ id: "a", displayName: "Rakotomavo", status: "PENDING", confirmedCount: null }),
          foyer({ id: "b", displayName: "Andriamanana" }),
          foyer({ id: "c", displayName: "Rabe" }),
        ],
      });
      await screen.findByText("3 foyers");
      await utilisateur.click(screen.getByRole("button", { name: "Confirmés" }));
      expect(await screen.findByText("2 foyers trouvés")).toBeInTheDocument();
    });

    it("opens the creation dialog from « Ajouter un foyer »", async () => {
      const utilisateur = userEvent.setup();
      renderPage();
      await screen.findByText("Famille Rakoto");
      await utilisateur.click(screen.getByRole("button", { name: "Ajouter un foyer" }));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("what it asks the API", () => {
    it("asks for 25 households sorted by name, ascending, from the first", async () => {
      const { get } = renderPage();
      await screen.findByText("Famille Rakoto");
      const p = derniereDemande(get);
      expect(p.get("limit")).toBe("25");
      expect(p.get("offset")).toBe("0");
      expect(p.get("sort")).toBe("name");
      expect(p.get("order")).toBe("asc");
      expect(p.has("q")).toBe(false);
      expect(p.has("status")).toBe(false);
    });

    it("sends the search to the API once the organiser pauses, not at every key", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({
        households: [foyer({ displayName: "Rakotomavo" }), foyer({ id: "b2", displayName: "Andriamanana" })],
      });

      await screen.findByText("Rakotomavo");
      await utilisateur.type(screen.getByRole("searchbox", { name: "Rechercher un foyer" }), "andria");

      await waitFor(() => expect(derniereDemande(get).get("q")).toBe("andria"));
      // Une requête par pause, pas une par lettre.
      expect(demandes(get).filter((p) => p.has("q")).map((p) => p.get("q"))).toEqual(["andria"]);
      await waitFor(() => expect(screen.queryByText("Rakotomavo")).toBeNull());
      expect(screen.getByText("Andriamanana")).toBeInTheDocument();
    });

    it("sends the status chosen with a pill, and marks that pill pressed", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage();
      await screen.findByText("Famille Rakoto");
      const enAttente = screen.getByRole("button", { name: "En attente" });
      await utilisateur.click(enAttente);
      await waitFor(() => expect(derniereDemande(get).get("status")).toBe("PENDING"));
      expect(enAttente).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Tous" })).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("empty states", () => {
    it("says so when the search finds nothing, instead of showing an empty table", async () => {
      const utilisateur = userEvent.setup();
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });

      await screen.findByText("Rakotomavo");
      await utilisateur.type(screen.getByRole("searchbox", { name: "Rechercher un foyer" }), "zzz");

      expect(await screen.findByText("Aucun foyer ne correspond")).toBeInTheDocument();
      expect(screen.getByText("Aucun foyer trouvé")).toBeInTheDocument();
    });

    it("tells an empty guest list apart from a search that finds nothing", async () => {
      renderPage({ households: [] });
      expect(await screen.findByText(/Ajoutez le premier foyer/)).toBeInTheDocument();
      expect(screen.queryByText("Aucun foyer ne correspond")).toBeNull();
    });
  });

  describe("the table", () => {
    // L'invariant qui a cassé trois fois : sans réponse, « — », jamais « 0 ».
    it("writes a dash for a household that has not answered, and 0 for one that declined", async () => {
      renderPage({
        households: [
          foyer({ id: "a", displayName: "Rakotomavo", status: "PENDING", confirmedCount: null, allocatedSeats: 4 }),
          foyer({ id: "b", displayName: "Andriamanana", status: "DECLINED", confirmedCount: 0, allocatedSeats: 2 }),
        ],
      });
      const enAttente = (await screen.findByText("Rakotomavo")).closest("tr") as HTMLElement;
      expect(within(enAttente).getByText("— / 4")).toBeInTheDocument();
      const decline = screen.getByText("Andriamanana").closest("tr") as HTMLElement;
      expect(within(decline).getByText("0 / 2")).toBeInTheDocument();
    });

    it("titles its columns in French", async () => {
      renderPage();
      await screen.findByText("Famille Rakoto");
      expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
        "Foyer",
        "Places",
        "Statut",
        "Actions",
        "",
      ]);
    });

    it("offers the copy gesture on every row, named after the household", async () => {
      renderPage({ households: [foyer({ displayName: "Rakotomavo", id: "aZ3k9Lm2" })] });
      expect(await screen.findByRole("button", { name: /Copier le lien de Rakotomavo/ })).toBeInTheDocument();
    });
  });

  describe("members switch", () => {
    const AVEC_MEMBRES = [foyer({ displayName: "Famille Andriambelo", memberNames: ["Lova Andriambelo", "Haja Andriambelo"] })];

    it("shows the members' full names under the household, by default", async () => {
      renderPage({ households: AVEC_MEMBRES });
      expect(await screen.findByText("Lova Andriambelo, Haja Andriambelo")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Afficher les membres" })).toHaveAttribute("aria-checked", "true");
    });

    it("hides them when switched off, and remembers it for the next visit", async () => {
      const utilisateur = userEvent.setup();
      const premiere = renderPage({ households: AVEC_MEMBRES });
      await screen.findByText("Lova Andriambelo, Haja Andriambelo");

      await utilisateur.click(screen.getByRole("switch", { name: "Afficher les membres" }));
      expect(screen.getByText("Famille Andriambelo")).toBeInTheDocument();
      expect(screen.queryByText("Lova Andriambelo, Haja Andriambelo")).toBeNull();
      premiere.unmount();
      vi.restoreAllMocks();

      renderPage({ households: AVEC_MEMBRES });
      await screen.findByText("Famille Andriambelo");
      expect(screen.getByRole("switch", { name: "Afficher les membres" })).toHaveAttribute("aria-checked", "false");
      expect(screen.queryByText("Lova Andriambelo, Haja Andriambelo")).toBeNull();
    });
  });

  describe("pagination", () => {
    it("shows one page and says how many there are in all", async () => {
      renderPage({ households: foyersNumerotes(30) });
      expect(await screen.findByText("Foyer 25")).toBeInTheDocument();
      expect(screen.queryByText("Foyer 26")).toBeNull();
      expect(screen.getByText("1–25 sur 30")).toBeInTheDocument();
    });

    it("asks for the next page and shows it", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await screen.findByText("Foyer 01");

      await utilisateur.click(screen.getByRole("button", { name: "Page suivante" }));

      expect(await screen.findByText("Foyer 26")).toBeInTheDocument();
      expect(screen.queryByText("Foyer 01")).toBeNull();
      expect(derniereDemande(get).get("offset")).toBe("25");
      expect(screen.getByText("26–30 sur 30")).toBeInTheDocument();
    });

    // Le bouton reste là (`aria-disabled` à la dernière page) : le focus ne
    // retombe pas sur <body> après un changement de page.
    it("keeps the focus on « Suivant » after paging", async () => {
      const utilisateur = userEvent.setup();
      renderPage({ households: foyersNumerotes(30) });
      await screen.findByText("Foyer 01");
      const suivant = screen.getByRole("button", { name: "Page suivante" });
      suivant.focus();
      await utilisateur.keyboard("{Enter}");
      await screen.findByText("Foyer 26");
      expect(suivant).toHaveFocus();
    });

    // `keepPreviousData` : la page en cours reste à l'écran pendant que la
    // suivante arrive, au lieu de clignoter en squelettes à chaque clic.
    it("keeps the current page on screen while the next one loads", async () => {
      const utilisateur = userEvent.setup();
      const reponses = serveur(foyersNumerotes(30));
      renderPage({
        get: (chemin) =>
          parametres(chemin).get("offset") === "25" ? new Promise<never>(() => {}) : reponses(chemin),
      });
      await screen.findByText("Foyer 01");

      await utilisateur.click(screen.getByRole("button", { name: "Page suivante" }));

      expect(screen.getByText("Foyer 01")).toBeInTheDocument();
      expect(screen.queryByTestId("skeleton")).toBeNull();
    });

    async function allerPage2(utilisateur: Utilisateur) {
      await screen.findByText("Foyer 01");
      await utilisateur.click(screen.getByRole("button", { name: "Page suivante" }));
      await screen.findByText("Foyer 26");
    }

    it("goes back to the first page when the status filter changes", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await allerPage2(utilisateur);

      await utilisateur.click(screen.getByRole("button", { name: "Confirmés" }));

      await waitFor(() => expect(derniereDemande(get).get("status")).toBe("CONFIRMED"));
      expect(derniereDemande(get).get("offset")).toBe("0");
      expect(await screen.findByText("Foyer 01")).toBeInTheDocument();
    });

    it("goes back to the first page when the search changes", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await allerPage2(utilisateur);

      await utilisateur.type(screen.getByRole("searchbox", { name: "Rechercher un foyer" }), "foyer");

      await waitFor(() => expect(derniereDemande(get).get("q")).toBe("foyer"));
      expect(derniereDemande(get).get("offset")).toBe("0");
    });

    it("goes back to the first page when the sort changes", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await allerPage2(utilisateur);

      await utilisateur.selectOptions(screen.getByLabelText("Trier par"), "seats");

      await waitFor(() => expect(derniereDemande(get).get("sort")).toBe("seats"));
      expect(derniereDemande(get).get("offset")).toBe("0");
    });

    it("goes back to the first page when the order flips", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await allerPage2(utilisateur);

      await utilisateur.click(screen.getByRole("button", { name: /Sens du tri/ }));

      await waitFor(() => expect(derniereDemande(get).get("order")).toBe("desc"));
      expect(derniereDemande(get).get("offset")).toBe("0");
    });

    it("goes back to the first page when the page size changes", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await allerPage2(utilisateur);

      await utilisateur.selectOptions(screen.getByLabelText("Par page"), "10");

      await waitFor(() => expect(derniereDemande(get).get("limit")).toBe("10"));
      expect(derniereDemande(get).get("offset")).toBe("0");
      expect(await screen.findByText("1–10 sur 30")).toBeInTheDocument();
    });

    // Supprimer le seul foyer de la dernière page la laisse vide : l'écran
    // recule d'une page plutôt que d'afficher « aucun foyer » à tort.
    it("steps back when the current page has emptied", async () => {
      const utilisateur = userEvent.setup();
      let foyers = foyersNumerotes(26);
      vi.spyOn(apiModule.api, "delete").mockImplementation(() => {
        foyers = foyers.filter((f) => f.id !== "f26");
        return Promise.resolve(undefined);
      });
      renderPage({ get: (chemin) => serveur(foyers)(chemin) });
      await allerPage2(utilisateur);

      await viaLeMenu(utilisateur, "Foyer 26", "Supprimer");
      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));

      expect(await screen.findByText("Foyer 01")).toBeInTheDocument();
      expect(screen.getByText("1–25 sur 25")).toBeInTheDocument();
      expect(screen.queryByText(/Ajoutez le premier foyer/)).toBeNull();
    });
  });

  describe("page size memory", () => {
    it("remembers the chosen page size for the next visit", async () => {
      const utilisateur = userEvent.setup();
      const premiere = renderPage({ households: foyersNumerotes(30) });
      await screen.findByText("Foyer 01");
      await utilisateur.selectOptions(screen.getByLabelText("Par page"), "50");
      await screen.findByText("1–30 sur 30");
      premiere.unmount();
      vi.restoreAllMocks();

      const { get } = renderPage({ households: foyersNumerotes(30) });
      await screen.findByText("Foyer 01");
      expect(derniereDemande(get).get("limit")).toBe("50");
      expect(screen.getByLabelText("Par page")).toHaveValue("50");
    });

    it("ignores a stored size it does not offer", async () => {
      window.localStorage.setItem("foyers.parPage", "7");
      const { get } = renderPage();
      await screen.findByText("Famille Rakoto");
      expect(derniereDemande(get).get("limit")).toBe("25");
    });

    // Navigation privée stricte, quota plein : l'écran marche sans.
    it("works when storage is unavailable", async () => {
      const utilisateur = userEvent.setup();
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await screen.findByText("Foyer 01");
      expect(derniereDemande(get).get("limit")).toBe("25");

      await utilisateur.selectOptions(screen.getByLabelText("Par page"), "10");
      expect(await screen.findByText("1–10 sur 30")).toBeInTheDocument();
      await utilisateur.click(screen.getByRole("switch", { name: "Afficher les membres" }));
      expect(screen.getByRole("switch", { name: "Afficher les membres" })).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("sorting", () => {
    it("says the current order in words, and flips it", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage();
      await screen.findByText("Famille Rakoto");
      const sens = screen.getByRole("button", { name: /Sens du tri/ });
      expect(sens).toHaveTextContent("Croissant");

      await utilisateur.click(sens);

      expect(sens).toHaveTextContent("Décroissant");
      await waitFor(() => expect(derniereDemande(get).get("order")).toBe("desc"));
    });
  });

  // Décision du commanditaire : un foyer déplié le reste d'une page à l'autre.
  it("keeps an unfolded household unfolded across pages", async () => {
    const utilisateur = userEvent.setup();
    renderPage({ households: foyersNumerotes(30) });
    await utilisateur.click(await screen.findByRole("button", { name: "Détail de Foyer 01" }));
    expect(screen.getByText("Note 01")).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "Page suivante" }));
    await screen.findByText("Foyer 26");
    await utilisateur.click(screen.getByRole("button", { name: "Page précédente" }));

    await screen.findByText("Foyer 01");
    expect(screen.getByText("Note 01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Détail de Foyer 01" })).toHaveAttribute("aria-expanded", "true");
  });

  // La table est démontée le temps d'une recherche vide : le dépli tenu par la
  // page survit, celui qu'aurait tenu la table serait perdu.
  it("keeps an unfolded household unfolded after a search that found nothing", async () => {
    const utilisateur = userEvent.setup();
    renderPage({ households: foyersNumerotes(3) });
    await utilisateur.click(await screen.findByRole("button", { name: "Détail de Foyer 01" }));

    const champ = screen.getByRole("searchbox", { name: "Rechercher un foyer" });
    await utilisateur.type(champ, "zzz");
    await screen.findByText("Aucun foyer ne correspond");
    await utilisateur.clear(champ);

    expect(await screen.findByText("Note 01")).toBeInTheDocument();
  });

  // PATCH /admin/households/:id was unreachable from the UI, so admins could
  // not correct an RSVP past the guest-facing deadline as the spec requires.
  it("edits a household from the « … » menu and PATCHes the change", async () => {
    const utilisateur = userEvent.setup();
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();
    await screen.findByText("Famille Rakoto");

    await viaLeMenu(utilisateur, "Famille Rakoto", "Modifier");
    expect(await screen.findByRole("heading", { name: /modifier le foyer/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/personnes confirmées/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith("/admin/households/h1", {
        displayName: "Famille Rakoto",
        allocatedSeats: 4,
        memberNames: [],
        // Pas de `dietaryNotes` : l'organisateur n'y a pas touché, donc le
        // champ ne part pas.
        status: "CONFIRMED",
        confirmedCount: 4,
      }),
    );
  });

  // Le menu rend le focus à « … » avant d'ouvrir le dialogue, qui le retient
  // et le lui rend à la fermeture.
  it("gives the focus back to the row's « … » when the edit dialog closes", async () => {
    const utilisateur = userEvent.setup();
    renderPage();
    await screen.findByText("Famille Rakoto");
    await viaLeMenu(utilisateur, "Famille Rakoto", "Modifier");
    await screen.findByRole("dialog");
    await utilisateur.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("button", { name: "Actions pour Famille Rakoto" })).toHaveFocus());
  });

  // L'API répond en anglais ; l'écran ne recopie jamais `err.message`.
  it("explains a refused edit in French, never in the API's English", async () => {
    const utilisateur = userEvent.setup();
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(new Error("confirmedCount cannot exceed allocatedSeats"));
    renderPage();
    await screen.findByText("Famille Rakoto");

    await viaLeMenu(utilisateur, "Famille Rakoto", "Modifier");
    fireEvent.click(await screen.findByRole("button", { name: /enregistrer/i }));

    expect(
      await screen.findByText(/Les modifications du foyer Famille Rakoto n'ont pas pu être enregistrées/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cannot exceed allocatedSeats/i)).toBeNull();
  });

  it("reloads the list after a deletion", async () => {
    const utilisateur = userEvent.setup();
    vi.spyOn(apiModule.api, "delete").mockResolvedValue(undefined);
    const { get } = renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });
    await screen.findByText("Rakotomavo");
    const avant = demandes(get).length;

    await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));

    await waitFor(() => expect(demandes(get).length).toBeGreaterThan(avant));
  });

  // La ligne et son « … » disparaissent avec le foyer : sans repère, le focus
  // tomberait sur <body> et l'organisateur au clavier repartirait du haut.
  it("puts the focus on the list once the deleted household is gone", async () => {
    const utilisateur = userEvent.setup();
    let foyers = [foyer({ id: "a", displayName: "Rakotomavo" }), foyer({ id: "b", displayName: "Andriamanana" })];
    vi.spyOn(apiModule.api, "delete").mockImplementation(() => {
      foyers = foyers.filter((f) => f.id !== "a");
      return Promise.resolve(undefined);
    });
    renderPage({ get: (chemin) => serveur(foyers)(chemin) });
    await screen.findByText("Rakotomavo");

    await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));

    await waitFor(() => expect(screen.queryByText("Rakotomavo")).toBeNull());
    await waitFor(() => expect(screen.getByRole("region", { name: "Liste des foyers" })).toHaveFocus());
    expect(screen.getByText("Andriamanana")).toBeInTheDocument();
  });

  it("explains a failed deletion in French", async () => {
    const utilisateur = userEvent.setup();
    vi.spyOn(apiModule.api, "delete").mockRejectedValue(new Error("Household not found"));
    renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });
    await screen.findByText("Rakotomavo");

    await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
    await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));

    expect(await screen.findByText(/Le foyer Rakotomavo n'a pas pu être supprimé/)).toBeInTheDocument();
    expect(screen.queryByText(/Household not found/)).toBeNull();
  });

  describe("deletion guard", () => {
    // LE garde-fou : choisir « Supprimer » ne supprime pas.
    it("never deletes on the first click", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });
      await screen.findByText("Rakotomavo");

      await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
      expect(supprimer).not.toHaveBeenCalled();
    });

    it("deletes only once the confirmation is pressed", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });
      await screen.findByText("Rakotomavo");

      await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));
      expect(supprimer).toHaveBeenCalledTimes(1);
    });

    it("cancels without deleting", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });
      await screen.findByText("Rakotomavo");

      await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
      await utilisateur.click(await screen.findByRole("button", { name: "Annuler" }));
      expect(supprimer).not.toHaveBeenCalled();
    });

    // Ce qui distingue ce garde-fou d'un « Êtes-vous sûr ? » : il dit ce qu'on perd.
    it("spells out what is lost when the household has already answered", async () => {
      const utilisateur = userEvent.setup();
      renderPage({ households: [foyer({ displayName: "Rakotomavo", status: "CONFIRMED", confirmedCount: 4 })] });
      await screen.findByText("Rakotomavo");

      await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
      expect(await screen.findByText(/a confirmé 4 personnes/)).toBeInTheDocument();
      expect(screen.getByText(/son lien cessera de fonctionner/)).toBeInTheDocument();
    });

    it("agrees the noun with the number for a household of one", async () => {
      const utilisateur = userEvent.setup();
      renderPage({ households: [foyer({ displayName: "Rakotomavo", status: "CONFIRMED", confirmedCount: 1 })] });
      await screen.findByText("Rakotomavo");

      await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
      expect(await screen.findByText(/a confirmé 1 personne\./)).toBeInTheDocument();
    });
  });

  // Sous 768 px : un seul rendu, des cartes — jamais la table cachée par CSS.
  describe("on a phone", () => {
    beforeEach(() => ecran(false));

    it("draws cards instead of the table", async () => {
      renderPage({ households: foyersNumerotes(3) });
      expect(await screen.findByRole("article", { name: "Foyer 01" })).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.getAllByText("Foyer 01")).toHaveLength(1);
    });

    it("keeps its header stuck to the top, with a short « Ajouter »", async () => {
      renderPage();
      await screen.findByRole("article", { name: "Famille Rakoto" });
      expect(screen.getByRole("banner")).toHaveClass("max-md:sticky");
      // Visible « Ajouter », nom accessible complet (le visible y est inclus).
      const ajouter = screen.getByRole("button", { name: "Ajouter un foyer" });
      expect(ajouter).toHaveTextContent(/^Ajouter$/);
    });

    it("shows the first names on the card, and only them", async () => {
      renderPage({ households: [foyer({ memberNames: ["Lova Andriambelo", "Haja Andriambelo"] })] });
      const carte = await screen.findByRole("article", { name: "Famille Rakoto" });
      expect(within(carte).getByText("Lova, Haja")).toBeInTheDocument();
    });

    it("unfolds a card in place from its header", async () => {
      const utilisateur = userEvent.setup();
      renderPage();
      const carte = await screen.findByRole("article", { name: "Famille Rakoto" });
      const entete = within(carte).getByRole("button", { name: /^Famille Rakoto/ });
      expect(entete).toHaveAttribute("aria-expanded", "false");
      await utilisateur.click(entete);
      expect(entete).toHaveAttribute("aria-expanded", "true");
      expect(within(carte).getByText("Deux repas végétariens")).toBeInTheDocument();
    });

    it("pages with the compact arrows", async () => {
      const utilisateur = userEvent.setup();
      renderPage({ households: foyersNumerotes(30) });
      await screen.findByRole("article", { name: "Foyer 01" });
      expect(screen.getByText("1–25 sur 30")).toBeInTheDocument();
      await utilisateur.click(screen.getByRole("button", { name: "Page suivante" }));
      expect(await screen.findByRole("article", { name: "Foyer 26" })).toBeInTheDocument();
    });

    it("changes the page size from the toolbar", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage({ households: foyersNumerotes(30) });
      await screen.findByRole("article", { name: "Foyer 01" });
      expect(screen.getAllByLabelText("Par page")).toHaveLength(1);
      await utilisateur.selectOptions(screen.getByLabelText("Par page"), "10");
      await waitFor(() => expect(derniereDemande(get).get("limit")).toBe("10"));
    });

    it("sorts from the « Trier » sheet", async () => {
      const utilisateur = userEvent.setup();
      const { get } = renderPage();
      await screen.findByRole("article", { name: "Famille Rakoto" });
      await utilisateur.click(screen.getByRole("button", { name: "Trier" }));
      const feuille = await screen.findByRole("dialog", { name: "Trier" });
      await utilisateur.selectOptions(within(feuille).getByLabelText("Trier par"), "status");
      await waitFor(() => expect(derniereDemande(get).get("sort")).toBe("status"));
    });

    it("deletes from the card's « … » menu, behind the guard", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue(undefined);
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });
      await screen.findByRole("article", { name: "Rakotomavo" });

      await viaLeMenu(utilisateur, "Rakotomavo", "Supprimer");
      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer le foyer" }));
      expect(supprimer).toHaveBeenCalledWith("/admin/households/h1");
    });
  });
});
