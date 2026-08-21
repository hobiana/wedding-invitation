import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { SettingsPage } from "./SettingsPage";
import * as apiModule from "@/lib/api";

const settings: AdminSettingsDto = {
  weddingDate: "2027-06-12T14:00:00.000Z",
  venueName: "Domaine des Roses",
  address: "1 rue des Fleurs",
  mapUrl: "",
  dressCode: "",
  parkingInfo: "",
  rsvpDeadline: "2027-05-01T22:00:00.000Z",
  seatingPlanActivated: false,
};

function renderPage() {
  vi.spyOn(apiModule.api, "get").mockResolvedValue(settings);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
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
