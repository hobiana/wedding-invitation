import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InvitationResponseDto } from "@invitation-app/shared";
import { InvitationPage } from "./InvitationPage";
import * as apiModule from "@/lib/api";

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

describe("InvitationPage RSVP deadline", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the RSVP form while the deadline is still ahead", async () => {
    renderPage(invitation("2099-01-01T00:00:00.000Z"));
    expect(await screen.findByRole("button", { name: /je viens/i })).toBeInTheDocument();
  });

  // Submitting after the deadline earns a raw English 403 from the API
  // ("RSVP deadline has passed") in an otherwise-French page.
  it("replaces the form with a closed notice once the deadline has passed", async () => {
    renderPage(invitation("2020-01-01T00:00:00.000Z"));

    expect(await screen.findByText(/les réponses sont closes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /je viens/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /je ne viendrai pas/i })).not.toBeInTheDocument();
  });

  it("summarises a confirmed household's last known answer", async () => {
    renderPage(
      invitation("2020-01-01T00:00:00.000Z", { status: "CONFIRMED", confirmedCount: 3 }),
    );
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

  const FUTURE_DEADLINE = "2027-05-01T12:00:00.000Z";

  it("tells the guest what time to turn up, not just the day", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    // Hour asserted loosely: no TZ is pinned in the Vitest config.
    expect(await screen.findByText(/12 juin 2027.+\d{1,2}:\d{2}/)).toBeInTheDocument();
  });

  it("shows the venue and its address", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByText("Domaine des Roses")).toBeInTheDocument();
    expect(screen.getByText("1 rue des Fleurs")).toBeInTheDocument();
  });

  it("shows the RSVP deadline while the guest can still answer", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByRole("button", { name: /je viens/i })).toBeInTheDocument();
    expect(screen.getByText(/mai 2027/)).toBeInTheDocument();
  });

  it("renders dress code, parking and a map link when they are filled in", async () => {
    renderPage(
      invitation(FUTURE_DEADLINE, {}, {
        mapUrl: "https://maps.example.com/domaine-des-roses",
        dressCode: "Tenue de soirée, bordeaux bienvenu",
        parkingInfo: "Parking gratuit derrière la chapelle",
      }),
    );

    expect(await screen.findByText(/tenue de soirée, bordeaux bienvenu/i)).toBeInTheDocument();
    expect(screen.getByText(/parking gratuit derrière la chapelle/i)).toBeInTheDocument();
    const mapLink = screen.getByRole("link", { name: /itinéraire/i });
    expect(mapLink).toHaveAttribute("href", "https://maps.example.com/domaine-des-roses");
    expect(mapLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("omits the optional headings entirely when the fields are empty", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByText("Domaine des Roses")).toBeInTheDocument();
    // The labels themselves, so this also catches a block rendered with an
    // empty value rather than not rendered at all.
    expect(screen.queryByText(/tenue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stationnement/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /itinéraire/i })).not.toBeInTheDocument();
  });

  it("names the people invited when the household lists them", async () => {
    renderPage(invitation(FUTURE_DEADLINE, { memberNames: ["Jean Rakoto", "Marie Rakoto"] }));

    expect(await screen.findByText(/jean rakoto/i)).toBeInTheDocument();
    expect(screen.getByText(/marie rakoto/i)).toBeInTheDocument();
  });

  it("does not render an empty line when no member names were recorded", async () => {
    renderPage(invitation(FUTURE_DEADLINE));

    expect(await screen.findByText("Domaine des Roses")).toBeInTheDocument();
    expect(screen.queryByText(/invitation pour/i)).not.toBeInTheDocument();
  });

  // mapUrl is free text in the admin form. A javascript: URL reaching href
  // would be a script-injection foothold on the one page guests actually open.
  it("ignores a map URL that is not http(s)", async () => {
    renderPage(invitation(FUTURE_DEADLINE, {}, { mapUrl: "javascript:alert(1)" }));

    expect(await screen.findByText("Domaine des Roses")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /itinéraire/i })).not.toBeInTheDocument();
  });
});
