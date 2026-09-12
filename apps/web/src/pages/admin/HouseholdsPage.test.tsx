import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { HouseholdAdminDto } from "@invitation-app/shared";
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

function renderPage({
  households = UN_FOYER,
  pending = false,
}: { households?: HouseholdAdminDto[]; pending?: boolean } = {}) {
  vi.spyOn(apiModule.api, "get").mockImplementation(() =>
    // Une promesse qui ne se résout jamais : le seul moyen d'observer l'état
    // de chargement sans dépendre d'un vrai délai réseau dans le test.
    pending ? new Promise<never>(() => {}) : Promise.resolve(households),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HouseholdsPage />
    </QueryClientProvider>,
  );
}

describe("HouseholdsPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("waits with skeletons rather than with an empty screen", () => {
    // Requête qui ne répond pas : l'écran doit montrer l'attente, pas du vide.
    renderPage({ pending: true });
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement des foyers…");
  });

  // The catering data guests submit had no admin-facing surface at all — it
  // now lives in the row's unfolded detail, not in the list itself.
  it("shows the dietary notes and message a guest submitted", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Détail de Famille Rakoto/ }));
    expect(screen.getByText("Deux repas végétariens")).toBeInTheDocument();
    expect(screen.getByText("Hâte d'y être !")).toBeInTheDocument();
  });

  it("filters the list as the organiser types", async () => {
    const utilisateur = userEvent.setup();
    renderPage({
      households: [foyer({ displayName: "Rakotomavo" }), foyer({ id: "b2", displayName: "Andriamanana" })],
    });

    await screen.findByText("Rakotomavo");
    await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "andria");

    expect(screen.queryByText("Rakotomavo")).toBeNull();
    expect(screen.getByText("Andriamanana")).toBeInTheDocument();
  });

  it("says so when the search finds nothing, instead of showing an empty table", async () => {
    const utilisateur = userEvent.setup();
    renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });

    await screen.findByText("Rakotomavo");
    await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "zzz");

    expect(screen.getByText("Aucun foyer ne correspond")).toBeInTheDocument();
  });

  it("offers the copy gesture on every row, named after the household", async () => {
    renderPage({ households: [foyer({ displayName: "Rakotomavo", id: "aZ3k9Lm2" })] });
    expect(
      await screen.findByRole("button", { name: /Copier le lien de Rakotomavo/ }),
    ).toBeInTheDocument();
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

  describe("deletion guard", () => {
    // LE test de cette tâche : un clic sur « Supprimer » ne supprime pas.
    it("never deletes on the first click", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });

      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
      expect(supprimer).not.toHaveBeenCalled();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("deletes only once the confirmation is pressed", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });

      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
      await utilisateur.click(screen.getByRole("button", { name: "Supprimer le foyer" }));
      expect(supprimer).toHaveBeenCalledTimes(1);
    });

    it("cancels without deleting", async () => {
      const utilisateur = userEvent.setup();
      const supprimer = vi.spyOn(apiModule.api, "delete").mockResolvedValue({});
      renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });

      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
      await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
      expect(supprimer).not.toHaveBeenCalled();
    });

    // Ce qui distingue ce garde-fou d'un « Êtes-vous sûr ? » : il dit ce qu'on perd.
    it("spells out what is lost when the household has already answered", async () => {
      const utilisateur = userEvent.setup();
      renderPage({
        households: [foyer({ displayName: "Rakotomavo", status: "CONFIRMED", confirmedCount: 4 })],
      });

      await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
      expect(screen.getByText(/a confirmé 4 personnes/)).toBeInTheDocument();
      expect(screen.getByText(/son lien cessera de fonctionner/)).toBeInTheDocument();
    });
  });
});
