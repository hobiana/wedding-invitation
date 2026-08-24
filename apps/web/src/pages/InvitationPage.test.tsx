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

  it("tells the guest what time to turn up, not just the day", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByText(/12 juin 2027 à 1[0-9]\s*h\s*00/)).toBeInTheDocument();
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

  it("renders dress code, parking and a map link when they are filled in", async () => {
    renderPage(
      invitation(
        FUTURE_DEADLINE,
        {},
        {
          mapUrl: "https://maps.example.com/domaine-des-roses",
          dressCode: "Tenue de soirée, bordeaux bienvenu",
          parkingInfo: "Parking gratuit derrière la chapelle",
        },
      ),
    );

    expect(await screen.findByText(/tenue de soirée, bordeaux bienvenu/i)).toBeInTheDocument();
    expect(screen.getByText(/parking gratuit derrière la chapelle/i)).toBeInTheDocument();
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

      expect(await screen.findByText(/18\s*h\s*00/)).toBeInTheDocument();
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

  // §9 : « Si memberNames est vide, le libellé et les prénoms disparaissent, la
  // ligne de places reste. C'est l'information utile. »
  it("keeps the seat count and drops the addressing line when no names were recorded", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { allocatedSeats: 2 }));

    await screen.findByText("Famille Rakoto");
    expect(screen.queryByText(/cette invitation est adressée à/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/2 places vous sont réservées/i).length).toBeGreaterThan(0);
  });

  it("writes the reserved seats in the singular for a household of one", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { allocatedSeats: 1 }));

    expect((await screen.findAllByText(/1 place vous est réservée/i)).length).toBeGreaterThan(0);
  });
});

// Le fichier portrait pèse 25 Ko en AVIF contre 100 Ko en JPEG, et le paysage
// n'a aucune raison d'être servi à un téléphone. Deux `media` × deux `type`.
describe("InvitationPage — la photo du couple", () => {
  afterEach(() => vi.restoreAllMocks());

  it("serves a portrait crop to phones and a landscape one to wide screens", async () => {
    const { container } = renderPage(invitation(FUTURE_DEADLINE));
    await screen.findByText("Famille Rakoto");

    const sources = [...container.querySelectorAll("picture source")].map((s) => ({
      media: s.getAttribute("media"),
      type: s.getAttribute("type"),
      srcSet: s.getAttribute("srcset"),
    }));

    expect(sources).toEqual([
      { media: "(min-width: 768px)", type: "image/avif", srcSet: "/couple-paysage.avif" },
      { media: "(min-width: 768px)", type: "image/jpeg", srcSet: "/couple-paysage.jpg" },
      { media: null, type: "image/avif", srcSet: "/couple-portrait.avif" },
    ]);
  });

  // Le JPEG est le seul format que tout navigateur décode : c'est lui qui doit
  // rester dans le `<img>`, sinon un navigateur sans AVIF n'affiche rien.
  it("falls back to a JPEG that every browser can decode", async () => {
    renderPage(invitation(FUTURE_DEADLINE));
    await screen.findByText("Famille Rakoto");

    const img = screen.getByRole("img", { name: /hobiana et lovasoa/i });
    expect(img).toHaveAttribute("src", "/couple-portrait.jpg");
    // Réservées avant le chargement : sans elles la page saute sous le doigt
    // de l'invité quand la photo arrive, en 4G plus qu'ailleurs.
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
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
      expect(patch).toHaveBeenCalledWith("/invitation/abc12345/rsvp", {
        status: "CONFIRMED",
        confirmedCount: 4,
        dietaryNotes: undefined,
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

  it("renders every section of the invitation on first paint", async () => {
    renderPage(invitation(FUTURE_DEADLINE, {}, { dressCode: "Tenue de cocktail" }));

    await screen.findByText("Famille Rakoto");
    expect(screen.getByRole("region", { name: /le jour j/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /votre réponse/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: YES })).toBeInTheDocument();
    expect(screen.getByText(/tenue de cocktail/i)).toBeInTheDocument();
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
