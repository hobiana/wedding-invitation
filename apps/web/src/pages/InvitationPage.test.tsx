import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InvitationResponseDto } from "@invitation-app/shared";
import { InvitationPage } from "./InvitationPage";
import * as apiModule from "@/lib/api";

const YES = /nous serons là/i;
const NO = /nous ne pourrons pas venir/i;
const FUTURE_DEADLINE = "2027-05-01T12:00:00.000Z";

function invitation(
  rsvpDeadline: string,
  overrides: Partial<InvitationResponseDto["household"]> = {},
  weddingOverrides: Partial<InvitationResponseDto["wedding"]> = {},
) {
  return {
    household: {
      id: "abc12345",
      displayName: "Famille Rakoto",
      allocatedSeats: 4,
      memberNames: [],
      status: "PENDING",
      confirmedCount: null,
      dietaryNotes: null,
      message: null,
      ...overrides,
    },
    wedding: {
      weddingDate: "2027-06-12T14:00:00.000Z",
      venueName: "Domaine des Roses",
      address: "1 rue des Fleurs",
      mapUrl: null,
      dressCode: null,
      parkingInfo: null,
      rsvpDeadline,
      ...weddingOverrides,
    },
    seatingPlan: null,
  } as InvitationResponseDto;
}

function renderPage(data: InvitationResponseDto) {
  vi.spyOn(apiModule.api, "get").mockResolvedValue(data);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/i/abc12345"]}>
        <Routes>
          <Route path="/i/:linkId" element={<InvitationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Une section nommée par son titre — `<section aria-labelledby>` a le rôle `region`. */
function region(name: RegExp) {
  return within(screen.getByRole("region", { name }));
}

describe("InvitationPage RSVP deadline", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the RSVP form while the deadline is still ahead", async () => {
    renderPage(invitation("2099-01-01T00:00:00.000Z"));
    expect(await screen.findByRole("radio", { name: YES })).toBeInTheDocument();
  });

  // Submitting after the deadline earns a raw English 403 from the API
  // ("RSVP deadline has passed") in an otherwise-French page.
  it("replaces the form with a closed notice once the deadline has passed", async () => {
    renderPage(invitation("2020-01-01T00:00:00.000Z"));

    expect(await screen.findByText(/les réponses sont closes/i)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: YES })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: NO })).not.toBeInTheDocument();
  });

  it("summarises a confirmed household's last known answer", async () => {
    renderPage(invitation("2020-01-01T00:00:00.000Z", { status: "CONFIRMED", confirmedCount: 3 }));
    expect(await screen.findByText(/3 personnes présentes/i)).toBeInTheDocument();
  });

  it("says so when no answer was ever received", async () => {
    renderPage(invitation("2020-01-01T00:00:00.000Z"));
    expect(await screen.findByText(/n'avons pas reçu votre réponse/i)).toBeInTheDocument();
  });
});

// The page used to render three lines: the household name, the date with
// `dateStyle: "long"` (which drops the time entirely) and the address. Five
// fields the organiser fills in and the API already returns — mapUrl,
// dressCode, parkingInfo, rsvpDeadline, memberNames — were never read.
describe("InvitationPage practical information", () => {
  afterEach(() => vi.restoreAllMocks());

  // L'heure est écrite deux fois — dans le faire-part et dans le programme — et
  // c'est voulu : c'est celle qu'on relit la veille. D'où `getAllByText`.
  it("tells the guest what time to turn up, not just the day", async () => {
    renderPage(invitation(FUTURE_DEADLINE));
    await screen.findByRole("heading", { level: 1 });

    expect(screen.getAllByText(/17\s*h\s*00/).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId("bloc-date")).getByText("12")).toBeInTheDocument();
  });

  it("shows the venue and its address", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByText("1 rue des Fleurs")).toBeInTheDocument();
    expect(screen.getAllByText("Domaine des Roses").length).toBeGreaterThan(0);
  });

  it("shows the RSVP deadline while the guest can still answer", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByRole("radio", { name: YES })).toBeInTheDocument();
    expect(screen.getByText(/merci de nous répondre avant le 1er mai 2027/i)).toBeInTheDocument();
  });

  // Le « 04:00 » affiché jusqu'ici était le bug de fuseau qui affleurait. Une
  // heure limite ne veut rien dire pour un invité, et celle-là était fausse.
  it("gives the deadline as a day, without an hour that would mean nothing", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    const line = await screen.findByText(/merci de nous répondre avant/i);
    expect(line.textContent).not.toMatch(/\d{1,2}\s*[h:]\s*\d{2}/);
  });

  /**
   * La tenue a disparu de la page invité le 2026-09-11, décision du
   * commanditaire. Le champ, lui, existe toujours — colonne en base, champ du
   * DTO, saisie dans les réglages — et il est encore rempli par le seed. Rien
   * d'autre que cette assertion n'empêche la section de revenir par mégarde.
   */
  it("renders parking and a map link, but no longer the dress code", async () => {
    renderPage(
      invitation(
        FUTURE_DEADLINE,
        {},
        {
          mapUrl: "https://maps.example.com/domaine-des-roses",
          dressCode: "Tenue de soirée, bordeaux bienvenu",
          parkingInfo: "Parking disponible sur place",
        },
      ),
    );

    expect(await screen.findByText(/parking disponible sur place/i)).toBeInTheDocument();
    expect(screen.queryByText(/tenue de soirée, bordeaux bienvenu/i)).not.toBeInTheDocument();
    const mapLink = screen.getByRole("link", { name: /itinéraire/i });
    expect(mapLink).toHaveAttribute("href", "https://maps.example.com/domaine-des-roses");
    expect(mapLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("omits the optional headings entirely when the fields are empty", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    await screen.findByText("1 rue des Fleurs");
    const practical = region(/le jour j/i);
    expect(practical.queryByText(/^tenue$/i)).not.toBeInTheDocument();
    expect(practical.queryByText(/^stationnement$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /itinéraire/i })).not.toBeInTheDocument();
  });

  /**
   * Le seed remplit encore la tenue, et le formulaire de réglages la propose
   * toujours. Un mariage où elle serait le seul champ pratique rempli ne doit
   * pas ouvrir une section sur une liste vide : depuis que la tenue ne s'affiche
   * plus, c'est le stationnement seul qui décide si la section existe.
   */
  it("draws no practical section at all when only the dress code is filled in", async () => {
    renderPage(invitation(FUTURE_DEADLINE, {}, { dressCode: "Tenue de cocktail" }));

    await screen.findByText("1 rue des Fleurs");
    // `<dt>` a le rôle « term », et c'est le seul de la page.
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
  });

  // mapUrl is free text in the admin form. A javascript: URL reaching href
  // would be a script-injection foothold on the one page guests actually open.
  it("ignores a map URL that is not http(s)", async () => {
    renderPage(invitation(FUTURE_DEADLINE, {}, { mapUrl: "javascript:alert(1)" }));

    expect(await screen.findByText("1 rue des Fleurs")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /itinéraire/i })).not.toBeInTheDocument();
  });
});

// L'heure d'un événement physique est celle de son lieu. Rendue dans le fuseau
// du lecteur, une cérémonie à 15:00 UTC se lit 18:00 à Antananarivo, 17:00 à
// Paris et 11:00 à New York — trois invités, trois heures, un seul mariage.
describe("InvitationPage wedding time zone", () => {
  const realTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = realTz;
    vi.restoreAllMocks();
  });

  it.each(["Europe/Paris", "America/New_York", "Indian/Antananarivo"])(
    "reads 18 h 00, the venue's own time, for a guest in %s",
    async (tz) => {
      process.env.TZ = tz;
      renderPage(
        invitation("2099-01-01T00:00:00.000Z", {}, { weddingDate: "2027-06-12T15:00:00.000Z" }),
      );

      // Deux occurrences — le faire-part et le programme — et les deux doivent
      // lire la même heure, celle du lieu.
      const heures = await screen.findAllByText(/18\s*h\s*00/);
      expect(heures.length).toBeGreaterThan(0);
    },
  );

  // Afficher la mention selon le fuseau du lecteur laisserait l'ambiguïté à
  // celui qui est justement le plus exposé. Une parenthèse permanente coûte une
  // ligne et supprime la classe de problème entière.
  it("says which country's clock that is, whoever is reading", async () => {
    process.env.TZ = "Indian/Antananarivo";
    renderPage(invitation("2099-01-01T00:00:00.000Z"));

    expect(await screen.findByText(/heure de madagascar/i)).toBeInTheDocument();
  });
});

// §9 : la page s'ouvre en nommant son lecteur. C'est la seule information de la
// page qui soit propre à ce lien, et c'est ce qui la fait lire comme du courrier
// plutôt que comme une page web.
describe("InvitationPage — le héros et l'adressage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens by naming the household this link belongs to", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByText("Famille Rakoto")).toBeInTheDocument();
  });

  it("puts the couple in the page's only first-level heading", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/hobiana/i);
    expect(h1).toHaveTextContent(/lovasoa/i);
  });

  it("names the people invited when the household lists them", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { memberNames: ["Jean Rakoto", "Marie Rakoto"] }));

    expect(await screen.findByText("Jean Rakoto et Marie Rakoto")).toBeInTheDocument();
  });

  // Les places se lisent maintenant dans l'en-tête du foyer, en chiffre, à
  // côté de son nom — c'est la forme du design. Sans prénoms saisis, il ne
  // reste que le nom et le nombre, ce qui est l'information utile.
  it("keeps the seat count and drops the addressing line when no names were recorded", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { allocatedSeats: 2 }));

    await screen.findByText("Famille Rakoto");
    const reponse = region(/serez-vous là/i);
    expect(reponse.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText(/cette invitation est adressée à/i)).not.toBeInTheDocument();
  });
});

describe("InvitationPage — répondre", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the answer the guest actually gave", async () => {
    const patch = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage(invitation(FUTURE_DEADLINE, { allocatedSeats: 4 }));

    fireEvent.click(await screen.findByRole("radio", { name: YES }));
    fireEvent.click(screen.getByRole("button", { name: /envoyer notre réponse/i }));

    await waitFor(() =>
      // Aucun nombre dans le corps : l'invité ne peut plus en annoncer un, le
      // serveur le pose depuis les places accordées.
      expect(patch).toHaveBeenCalledWith("/invitation/abc12345/rsvp", {
        status: "CONFIRMED",
        message: undefined,
      }),
    );
  });

  it("replaces the form with the answer once it is recorded", async () => {
    vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage(invitation(FUTURE_DEADLINE, { allocatedSeats: 2 }));

    fireEvent.click(await screen.findByRole("radio", { name: YES }));
    fireEvent.click(screen.getByRole("button", { name: /envoyer notre réponse/i }));

    expect(await screen.findByText(/c'est noté/i)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: YES })).not.toBeInTheDocument();
  });

  it("lets the household change its mind and come back to the form", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { status: "CONFIRMED", confirmedCount: 2 }));

    expect(await screen.findByText(/c'est noté/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /modifier notre réponse/i }));

    expect(screen.getByRole("radio", { name: YES })).toBeChecked();
  });

  // L'API renvoie « RSVP deadline has passed ». Un message d'erreur anglais
  // affiché tel quel à un invité dans une page française est un défaut, et
  // celui-là a déjà été relevé une fois.
  it("never shows the guest the API's own English words", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(new Error("RSVP deadline has passed"));
    renderPage(invitation(FUTURE_DEADLINE));

    fireEvent.click(await screen.findByRole("radio", { name: NO }));
    fireEvent.click(screen.getByRole("button", { name: /envoyer notre réponse/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toMatch(/deadline has passed/i);
    expect(alert.textContent).toMatch(/réponse|enregistr/i);
  });

  it("keeps the guest's answer on screen when the send fails, so it is not retyped", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(new Error("Internal server error"));
    renderPage(invitation(FUTURE_DEADLINE));

    fireEvent.click(await screen.findByRole("radio", { name: NO }));
    fireEvent.click(screen.getByRole("button", { name: /envoyer notre réponse/i }));

    await screen.findByRole("alert");
    expect(screen.getByRole("radio", { name: NO })).toBeChecked();
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
  });
});

// Invariant 6 : le masquage est côté serveur. Le front ne fait que rendre ce
// qu'on lui donne — il ne décide jamais de cacher un plan qu'il aurait reçu.
describe("InvitationPage — le plan de table", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the table and its neighbours when the API sends a plan", async () => {
    const data = invitation(FUTURE_DEADLINE);
    data.seatingPlan = {
      tableName: "Table des Baobabs",
      neighbors: [{ displayName: "Famille Andria", confirmedCount: 2 }],
    };
    renderPage(data);
    await screen.findByText("Famille Rakoto");

    const seating = region(/à table/i);
    expect(seating.getByRole("heading", { name: "Table des Baobabs" })).toBeInTheDocument();
    expect(seating.getByText(/famille andria/i)).toBeInTheDocument();
  });

  it("shows no table section at all when the API sends none", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    await screen.findByText("Famille Rakoto");
    expect(screen.queryByRole("region", { name: /à table/i })).not.toBeInTheDocument();
  });
});

// La mise en scène des tâches 8a/8b viendra en surcouche. Ce qui est livré ici
// doit être entièrement lisible sans elle : aucune branche « avant ouverture »,
// aucun contenu qui attende un geste.
describe("InvitationPage — lisible sans aucune animation", () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * L'invitation s'ouvre par une enveloppe animée. Tout ce qui suit doit être
   * là au premier rendu, sans qu'une transition ait à se jouer : un invité dont
   * le JavaScript rame, ou qui a demandé moins d'animations, doit lire la même
   * page — pas une page vide en attendant.
   */
  it("renders every section of the invitation on first paint", async () => {
    renderPage(
      invitation(FUTURE_DEADLINE, {}, { parkingInfo: "Parking disponible sur place" }),
    );

    await screen.findByRole("heading", { level: 1 });
    for (const titre of [
      /le faire-part/i,
      /avant le grand jour/i,
      /le jour j approche/i,
      /le déroulé du jour/i,
      /domaine des roses/i,
      /serez-vous là/i,
    ]) {
      expect(screen.getByRole("region", { name: titre })).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: YES })).toBeInTheDocument();
    expect(screen.getByText(/parking disponible sur place/i)).toBeInTheDocument();

    // Et tout cela est là **pendant que l'enveloppe est encore fermée**. Sans
    // cette ligne, l'assertion ci-dessus deviendrait vide le jour où la porte
    // cesserait de se monter, et on ne verrait rien passer.
    expect(screen.getByTestId("porte")).toBeInTheDocument();
  });

  /**
   * La règle n° 1 du système de mouvement : **l'enveloppe est un habillage,
   * jamais une porte.** Le voile est posé par-dessus une page déjà rendue,
   * déjà complète, déjà défilable — il n'existe pas de branche « avant
   * ouverture » qui rendrait autre chose.
   *
   * Ce qui se joue ici n'est pas l'esthétique : un invité dont le voile ne se
   * lève pas — animation bloquée, clic perdu, navigateur exotique — doit
   * pouvoir répondre quand même. La page ne dépend de rien.
   */
  it("keeps the answer form reachable while the envelope is still closed", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByTestId("porte")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: YES })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /envoyer notre réponse/i }),
    ).toBeInTheDocument();
  });
});

describe("InvitationPage — joindre les mariés", () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * Le formulaire donne déjà les numéros, mais il disparaît dès qu'on a
   * répondu — et c'est justement après avoir répondu qu'on rappelle pour
   * signaler un changement, puisque l'invité ne peut plus corriger le nombre
   * lui-même. Le pied de page est le seul endroit qui ne s'efface jamais.
   */
  it("keeps the couple's numbers reachable once the form is gone", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { status: "CONFIRMED", confirmedCount: 4 }));

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("radio", { name: YES })).not.toBeInTheDocument();

    const liens = screen.getAllByRole("link", { name: /\+261/ });
    expect(liens).toHaveLength(2);
    liens.forEach((lien) => expect(lien.getAttribute("href")).toMatch(/^tel:\+261\d+$/));
  });
});

describe("InvitationPage — les états de chargement", () => {
  afterEach(() => vi.restoreAllMocks());

  it("tells the guest the page is loading rather than showing a blank screen", () => {
    vi.spyOn(apiModule.api, "get").mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/i/abc12345"]}>
          <Routes>
            <Route path="/i/:linkId" element={<InvitationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/chargement/i);
  });

  it("explains a broken link in French instead of showing an empty page", async () => {
    vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("Household not found"));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/i/abc12345"]}>
          <Routes>
            <Route path="/i/:linkId" element={<InvitationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/invitation/i);
    expect(alert.textContent).not.toMatch(/not found/i);
  });
});
