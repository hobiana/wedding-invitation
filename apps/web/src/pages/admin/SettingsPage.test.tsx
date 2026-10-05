import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { SettingsPage } from "./SettingsPage";
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
