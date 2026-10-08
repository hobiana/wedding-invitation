import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { SettingsPage } from "./SettingsPage";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

/**
 * Ce que le serveur renvoie vraiment quand rien n'est renseigné : `null`, et
 * non `""`. `SettingsService.update` ramène tout champ vidé à `null` avant
 * Prisma, et `AdminSettingsDto` déclare les trois facultatifs `string | null`.
 * Un montage qui les pose à `""` décrirait une réponse que l'API ne produit
 * plus — et laisserait passer le défaut qu'on vient corriger.
 */
const settings: AdminSettingsDto = {
  weddingDate: "2027-06-12T14:00:00.000Z",
  venueName: "Domaine des Roses",
  address: "1 rue des Fleurs",
  mapUrl: null,
  dressCode: null,
  parkingInfo: null,
  rsvpDeadline: "2027-05-01T22:00:00.000Z",
  seatingPlanActivated: false,
  maxGuests: 180,
};

function renderPage(overrides: Partial<AdminSettingsDto> = {}) {
  vi.spyOn(apiModule.api, "get").mockResolvedValue({ ...settings, ...overrides });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

/** Le corps du dernier PATCH parti sur le fil. */
function dernierCorps(spy: ReturnType<typeof vi.spyOn>) {
  const appels = spy.mock.calls as unknown as [string, Partial<AdminSettingsDto>][];
  return appels[appels.length - 1][1];
}

/** Same local-time rendering the datetime-local input performs. */
function expectedLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe("SettingsPage dates", () => {
  afterEach(() => vi.restoreAllMocks());

  // rsvpDeadline governs the whole public RSVP lock and could previously only
  // be changed with direct SQL.
  it("pre-fills the wedding date and the RSVP deadline", async () => {
    renderPage();

    const weddingDate = (await screen.findByLabelText(/date du mariage/i)) as HTMLInputElement;
    const deadline = screen.getByLabelText(/date limite de réponse/i) as HTMLInputElement;

    expect(weddingDate.type).toBe("datetime-local");
    expect(weddingDate.value).toBe(expectedLocalValue(settings.weddingDate));
    expect(deadline.value).toBe(expectedLocalValue(settings.rsvpDeadline));
  });

  it("patches a new RSVP deadline back as an ISO string", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    fireEvent.change(await screen.findByLabelText(/date limite de réponse/i), {
      target: { value: "2027-04-15T18:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    const [[path, body]] = patchSpy.mock.calls as [[string, AdminSettingsDto]];
    expect(path).toBe("/admin/settings");
    expect(body.rsvpDeadline).toBe(new Date("2027-04-15T18:30").toISOString());
    // untouched fields survive the round trip
    expect(body.venueName).toBe("Domaine des Roses");
    expect(body.weddingDate).toBe(settings.weddingDate);
  });
});

describe("SettingsPage — champs facultatifs", () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * Le cas de bord qu'on ne verra jamais à l'œil nu : `value={form.mapUrl}`
   * sur un champ `null` afficherait le mot « null » dans la case, ou rendrait
   * le contrôle non contrôlé au premier caractère tapé.
   */
  it("se peuple depuis une réponse aux trois facultatifs null, sans afficher « null »", async () => {
    renderPage();

    const carte = (await screen.findByLabelText(/lien vers la carte/i)) as HTMLInputElement;
    const tenue = screen.getByLabelText(/code vestimentaire/i) as HTMLInputElement;
    const parking = screen.getByLabelText(/informations parking/i) as HTMLTextAreaElement;

    expect(carte.value).toBe("");
    expect(tenue.value).toBe("");
    expect(parking.value).toBe("");
    expect(screen.queryByDisplayValue("null")).toBeNull();
  });

  /**
   * Le test central du lot. Une chaîne vide n'est pas un trou : elle traverse
   * le contrat comme une valeur, et la page invité affiche alors une ligne
   * blanche au lieu de ne rien afficher. Même classe de bug que le `0` écrit
   * à la place du `null` de `confirmedCount`.
   *
   * Le serveur referme la porte de son côté (`blankToNull`) ; celle-ci est du
   * bon côté du fil et évite l'aller-retour.
   */
  it("envoie null, et non une chaîne vide, pour un champ facultatif vidé", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage({
      mapUrl: "https://maps.example/domaine",
      dressCode: "Tenue de ville",
      parkingInfo: "Parking gratuit devant le domaine.",
    });

    fireEvent.change(await screen.findByLabelText(/lien vers la carte/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    const body = dernierCorps(patchSpy);
    expect(body.mapUrl).toBeNull();
    // Les deux autres n'ont pas bougé : les vider n'est pas contagieux.
    expect(body.dressCode).toBe("Tenue de ville");
    expect(body.parkingInfo).toBe("Parking gratuit devant le domaine.");
  });

  // Le serveur traite « vide » et « des espaces » de la même façon ; le
  // formulaire aussi, sinon une espace oubliée en sortant du champ suffit à
  // faire réapparaître la ligne blanche sur l'invitation.
  it("envoie null pour un champ facultatif réduit à des espaces", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage({ dressCode: "Tenue de ville" });

    fireEvent.change(await screen.findByLabelText(/code vestimentaire/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy).dressCode).toBeNull();
  });

  // La normalisation constate qu'un champ est vide ; elle ne réécrit pas ce
  // que l'organisateur a saisi.
  it("envoie tel quel un champ facultatif renseigné", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    fireEvent.change(await screen.findByLabelText(/informations parking/i), {
      target: { value: "Parking gratuit, entrée par la rue Rasoherina." },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy).parkingInfo).toBe(
      "Parking gratuit, entrée par la rue Rasoherina.",
    );
  });

  // `venueName` et `address` ne sont pas nullables en base : leur appliquer la
  // même normalisation écrirait un `null` que Prisma refuse, en 500.
  it("tient le lieu et l'adresse pour obligatoires", async () => {
    renderPage();

    const lieu = (await screen.findByLabelText(/lieu/i)) as HTMLInputElement;
    const adresse = screen.getByLabelText(/adresse/i) as HTMLInputElement;

    expect(lieu.required).toBe(true);
    expect(adresse.required).toBe(true);
  });

  it("n'envoie jamais null pour le lieu ni pour l'adresse", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    // Tous les facultatifs vides : c'est le tir où une normalisation trop
    // large emporterait aussi les deux champs obligatoires.
    fireEvent.click(await screen.findByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    const body = dernierCorps(patchSpy);
    expect(body.venueName).toBe("Domaine des Roses");
    expect(body.address).toBe("1 rue des Fleurs");
    expect(body.venueName).not.toBeNull();
    expect(body.address).not.toBeNull();
  });

  /**
   * `dressCode` est conservé bien qu'il ne s'affiche nulle part côté invité —
   * l'organisateur s'en sert pour répondre au téléphone. Sans la mention, il
   * le remplit en croyant qu'il part sur l'invitation.
   */
  it("marque le code vestimentaire comme non affiché sur l'invitation", async () => {
    renderPage();

    const tenue = await screen.findByLabelText(/code vestimentaire/i);
    const decritPar = tenue.getAttribute("aria-describedby");
    expect(decritPar).toBeTruthy();
    // Rattachée au champ, pas posée à côté : un lecteur d'écran doit l'entendre
    // en arrivant sur le contrôle.
    expect(document.getElementById(decritPar!)).toHaveTextContent(
      /non affiché sur l'invitation/i,
    );
  });
});

describe("SettingsPage — seuil maximum d'invités", () => {
  afterEach(() => vi.restoreAllMocks());

  async function saisirSeuil(valeur: string) {
    fireEvent.change(await screen.findByLabelText(/seuil maximum d'invités/i), {
      target: { value: valeur },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
  }

  it("se pré-remplit depuis les paramètres, clavier numérique sur téléphone", async () => {
    renderPage();

    const seuil = (await screen.findByLabelText(/seuil maximum d'invités/i)) as HTMLInputElement;
    expect(seuil.value).toBe("180");
    expect(seuil.inputMode).toBe("numeric");
  });

  it("affiche un champ vide, et non « null », quand aucun seuil n'est fixé", async () => {
    renderPage({ maxGuests: null });

    const seuil = (await screen.findByLabelText(/seuil maximum d'invités/i)) as HTMLInputElement;
    expect(seuil.value).toBe("");
  });

  it("explique, rattaché au champ, qu'on peut le laisser vide", async () => {
    renderPage();

    const seuil = await screen.findByLabelText(/seuil maximum d'invités/i);
    const decritPar = seuil.getAttribute("aria-describedby");
    expect(decritPar).toBeTruthy();
    expect(document.getElementById(decritPar!.split(" ")[0])).toHaveTextContent(
      /laissez vide pour ne fixer aucun seuil/i,
    );
  });

  // Un nombre, pas la chaîne tapée : `@IsInt()` refuserait "200" en 400.
  it("envoie la valeur saisie en nombre", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    await saisirSeuil("200");

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy).maxGuests).toBe(200);
  });

  it("renvoie le seuil existant tel quel quand on n'y touche pas", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy).maxGuests).toBe(180);
  });

  // Vide = « aucun seuil » : `null`, comme les champs texte facultatifs.
  // Ni `""`, ni `0` — `0` voudrait dire « personne ».
  it("envoie null pour un champ vidé", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    await saisirSeuil("  ");

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy).maxGuests).toBeNull();
  });

  it.each([
    ["un nombre décimal", "12.5"],
    ["zéro", "0"],
    ["un nombre négatif", "-3"],
    ["du texte", "deux cents"],
  ])("refuse %s, en français, sans appel réseau", async (_cas, valeur) => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    await saisirSeuil(valeur);

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/nombre entier/i);
    expect(screen.getByLabelText(/seuil maximum d'invités/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(patchSpy).not.toHaveBeenCalled();
  });

  // L'API refuse au-delà de 10 000 par un 400 au texte anglais : on l'arrête
  // avant, avec une phrase que l'organisateur comprend.
  it("refuse un seuil au-delà de 10 000, en français, sans appel réseau", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    await saisirSeuil("10001");

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/10 000/);
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it("accepte exactement 10 000", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    await saisirSeuil("10000");

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy).maxGuests).toBe(10000);
  });

  // Si le serveur refuse quand même (règle durcie, requête rejouée), son
  // message anglais ne remonte pas à l'écran.
  it("dit en français qu'un seuil refusé par l'API n'a pas été enregistré", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error("maxGuests must not be greater than 10000"),
    );
    renderPage();

    await saisirSeuil("500");

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/n'ont pas pu être enregistrés/i);
    expect(alerte).not.toHaveTextContent(/maxGuests|greater/);
  });

  it("efface le refus dès que la saisie est corrigée", async () => {
    vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    await saisirSeuil("0");
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/seuil maximum d'invités/i), {
      target: { value: "150" },
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("SettingsPage — plan de table", () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * Invariant 6 : la bascule est manuelle. Elle doit rester un geste isolé —
   * si elle emportait le formulaire entier, activer le plan de table
   * réécrirait au passage des champs que l'organisateur n'a pas relus, et
   * renverrait à `null` ce qu'il venait juste de taper sans enregistrer.
   */
  it("n'envoie que seatingPlanActivated, et rien d'autre", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage({ mapUrl: "https://maps.example/domaine" });

    // Un seuil invalide en cours de saisie ne bloque pas la bascule, et ne
    // part pas avec elle.
    fireEvent.change(await screen.findByLabelText(/seuil maximum d'invités/i), {
      target: { value: "0" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /^activer$/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy)).toEqual({ seatingPlanActivated: true });
  });

  it("propose de désactiver quand le plan est déjà visible", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage({ seatingPlanActivated: true });

    fireEvent.click(await screen.findByRole("button", { name: /désactiver/i }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
    expect(dernierCorps(patchSpy)).toEqual({ seatingPlanActivated: false });
  });
});

describe("SettingsPage — chargement et erreurs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("montre des squelettes tant que les paramètres n'arrivent pas", () => {
    // Jamais résolue : l'écran reste dans l'état d'attente pour de vrai.
    vi.spyOn(apiModule.api, "get").mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>,
    );

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(/chargement/i);
  });

  /**
   * Sans cet écran, un GET en échec laissait la page en « Chargement… » pour
   * toujours : l'organisateur attend une donnée qui n'arrivera jamais.
   */
  it("dit en français que les paramètres n'ont pas pu être chargés", async () => {
    vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("Request failed with status 500"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>,
    );

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/n'ont pas pu être chargés/i);
    expect(alerte).not.toHaveTextContent(/Request failed/);
  });

  // L'interface est en français sans exception, admin compris : le message de
  // l'API est anglais, il ne se recopie pas à l'écran.
  it("dit en français qu'un enregistrement a échoué, sans recopier l'API", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error("Request failed with status 400"),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /enregistrer/i }));

    const alerte = await screen.findByRole("alert");
    expect(alerte).toHaveTextContent(/n'ont pas pu être enregistrés/i);
    expect(alerte).not.toHaveTextContent(/Request failed/);
  });

  // Un enregistrement muet est indistinguable d'un bouton qui n'a rien fait.
  it("confirme l'enregistrement", async () => {
    vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText(/paramètres enregistrés/i)).toBeInTheDocument();
  });
});

describe("SettingsPage — compte (téléphone)", () => {
  const matchMediaOriginal = window.matchMedia;
  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = matchMediaOriginal;
  });

  function ecran(telephone: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: telephone,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  function rendreAvecSession() {
    vi.spyOn(apiModule.api, "get").mockImplementation(async (url: string) =>
      (url === "/auth/me" ? { id: "u1", email: "admin@example.com" } : settings) as never,
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  // La barre du haut a quitté l'admin sur téléphone : l'adresse connectée et
  // la déconnexion vivent ici, dans leur propre section.
  it("shows who is signed in, with a logout, on a phone", async () => {
    ecran(true);
    rendreAvecSession();

    expect(await screen.findByRole("heading", { name: "Compte" })).toBeInTheDocument();
    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se déconnecter/i })).toBeInTheDocument();
  });

  // Sur bureau le rail porte déjà la déconnexion : la doubler ici serait deux
  // boutons pour le même geste.
  it("does not repeat the account on desktop, where the rail has it", async () => {
    ecran(false);
    rendreAvecSession();

    await screen.findByLabelText(/lien vers la carte/i);
    expect(screen.queryByRole("heading", { name: "Compte" })).toBeNull();
    expect(screen.queryByRole("button", { name: /se déconnecter/i })).toBeNull();
  });
});
