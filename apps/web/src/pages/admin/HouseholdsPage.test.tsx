import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { HouseholdsPage } from "./HouseholdsPage";
import * as apiModule from "@/lib/api";

const households: HouseholdAdminDto[] = [
  {
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
  },
];

function renderPage() {
  vi.spyOn(apiModule.api, "get").mockResolvedValue(households);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HouseholdsPage />
    </QueryClientProvider>,
  );
}

describe("HouseholdsPage", () => {
  afterEach(() => vi.restoreAllMocks());

  // The catering data guests submit had no admin-facing surface at all.
  it("shows the dietary notes and message a guest submitted", async () => {
    renderPage();
    expect(await screen.findByText("Deux repas végétariens")).toBeInTheDocument();
    expect(screen.getByText("Hâte d'y être !")).toBeInTheDocument();
  });

  // PATCH /admin/households/:id was unreachable from the UI, so admins could
  // not correct an RSVP past the guest-facing deadline as the spec requires.
  it("edits a household through the dialog and PATCHes the change", async () => {
    const patchSpy = vi.spyOn(apiModule.api, "patch").mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /modifier/i }));
    expect(screen.getByRole("heading", { name: /modifier le foyer/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/personnes confirmées/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith("/admin/households/h1", {
        displayName: "Famille Rakoto",
        allocatedSeats: 4,
        status: "CONFIRMED",
        confirmedCount: 4,
      }),
    );
  });

  it("surfaces the API's rejection when an edit would break the seat allocation", async () => {
    vi.spyOn(apiModule.api, "patch").mockRejectedValue(
      new Error("confirmedCount cannot exceed allocatedSeats"),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(await screen.findByText(/cannot exceed allocatedSeats/i)).toBeInTheDocument();
  });
});
