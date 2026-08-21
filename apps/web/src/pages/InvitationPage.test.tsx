import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InvitationResponseDto } from "@invitation-app/shared";
import { InvitationPage } from "./InvitationPage";
import * as apiModule from "@/lib/api";

function invitation(rsvpDeadline: string, overrides: Partial<InvitationResponseDto["household"]> = {}) {
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
