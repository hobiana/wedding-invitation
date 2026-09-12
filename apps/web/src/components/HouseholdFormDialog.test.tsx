import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { HouseholdFormDialog } from "./HouseholdFormDialog";

function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
    id: "h1",
    displayName: "Famille Rakoto",
    allocatedSeats: 4,
    memberNames: [],
    status: "CONFIRMED",
    confirmedCount: 3,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partiel,
  };
}

const existing = foyer();

describe("HouseholdFormDialog", () => {
  it("submits displayName and allocatedSeats", () => {
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/nom du foyer/i), { target: { value: "Famille Rakoto" } });
    fireEvent.change(screen.getByLabelText(/nombre de places/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      displayName: "Famille Rakoto",
      allocatedSeats: 4,
      memberNames: [],
    });
  });

  it("pre-fills every field from the household being edited", () => {
    render(<HouseholdFormDialog initial={existing} onSubmit={vi.fn()} onClose={() => {}} />);

    expect(screen.getByRole("heading", { name: /modifier le foyer/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/nom du foyer/i) as HTMLInputElement).value).toBe("Famille Rakoto");
    expect((screen.getByLabelText(/nombre de places/i) as HTMLInputElement).value).toBe("4");
    expect((screen.getByLabelText(/statut/i) as HTMLSelectElement).value).toBe("CONFIRMED");
    expect((screen.getByLabelText(/personnes confirmées/i) as HTMLInputElement).value).toBe("3");
  });

  // The spec requires admins to be able to correct an RSVP at any time,
  // including past the guest-facing deadline.
  it("submits the corrected RSVP data in edit mode", () => {
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog initial={existing} onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/personnes confirmées/i), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      displayName: "Famille Rakoto",
      allocatedSeats: 4,
      memberNames: [],
      status: "CONFIRMED",
      dietaryNotes: "",
      confirmedCount: 2,
    });
  });

  it("zeroes the confirmed count when the admin marks a household as declined", () => {
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog initial={existing} onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/statut/i), { target: { value: "DECLINED" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "DECLINED", confirmedCount: 0 }));
  });

  // Regression: a household that never answered has confirmedCount: null,
  // meaning the seating maths falls back to allocatedSeats (its full
  // reservation). Editing it (e.g. only to fix a typo in the name) must not
  // silently overwrite that null with 0 — that would make the table planner
  // think it holds zero seats instead of its full allocation.
  it("omits confirmedCount when saving a household that is still pending", () => {
    const pending: HouseholdAdminDto = {
      ...existing,
      status: "PENDING",
      confirmedCount: null,
    };
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog initial={pending} onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/nom du foyer/i), { target: { value: "Famille Rakoto (corrigé)" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      displayName: "Famille Rakoto (corrigé)",
      allocatedSeats: 4,
      memberNames: [],
      status: "PENDING",
      dietaryNotes: "",
    });
  });

  // Sans ce champ, la vraie liste des foyers n'est saisissable que par le seed —
  // et la page invité n'a alors aucun nom à afficher.
  it("captures the member names, one per line", async () => {
    const utilisateur = userEvent.setup();
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog onSubmit={onSubmit} onClose={() => {}} />);

    await utilisateur.type(screen.getByLabelText(/Nom du foyer/), "Rakotomavo");
    await utilisateur.type(screen.getByLabelText(/Noms des invités/), "Fara\nNaina\n\n  Tiana  ");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ memberNames: ["Fara", "Naina", "Tiana"] }),
    );
  });

  // Sans ce champ, la tuile « Régimes particuliers » du tableau de bord affiche
  // 0 pour toujours : le formulaire invité ne demande plus le régime.
  it("lets an admin record a dietary note", async () => {
    const utilisateur = userEvent.setup();
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog initial={foyer()} onSubmit={onSubmit} onClose={() => {}} />);

    await utilisateur.clear(screen.getByLabelText(/Régime alimentaire/));
    await utilisateur.type(screen.getByLabelText(/Régime alimentaire/), "sans arachide");
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ dietaryNotes: "sans arachide" }),
    );
  });

  // Le mot de l'invité appartient à l'invité.
  it("shows the guest's message without letting the admin rewrite it", () => {
    render(
      <HouseholdFormDialog initial={foyer({ message: "Merci, on a hâte !" })} onSubmit={vi.fn()} onClose={() => {}} />,
    );
    expect(screen.getByText("Merci, on a hâte !")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Message/)).toBeNull();
  });

  // L'invariant, qui a déjà cassé trois fois : il ne bouge pas en passant aux
  // primitives.
  it("still refuses a confirmation without a count", async () => {
    const utilisateur = userEvent.setup();
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog initial={foyer({ status: "PENDING" })} onSubmit={onSubmit} onClose={() => {}} />);

    await utilisateur.selectOptions(screen.getByLabelText("Statut"), "CONFIRMED");
    await utilisateur.clear(screen.getByLabelText(/Personnes confirmées/));
    await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/au moins une personne/i);
  });

  describe("PENDING → CONFIRMED", () => {
    const pending: HouseholdAdminDto = { ...existing, status: "PENDING", confirmedCount: null };

    it("leaves the confirmed count empty rather than pre-filling it with 0", () => {
      render(<HouseholdFormDialog initial={pending} onSubmit={vi.fn()} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/statut/i), { target: { value: "CONFIRMED" } });

      expect((screen.getByLabelText(/personnes confirmées/i) as HTMLInputElement).value).toBe("");
    });

    it("refuses to submit a confirmed household without a count, and says so in French", () => {
      const onSubmit = vi.fn();
      render(<HouseholdFormDialog initial={pending} onSubmit={onSubmit} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/statut/i), { target: { value: "CONFIRMED" } });
      fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/au moins une personne/i);
    });

    it("submits once the count is filled in, and clears the error", () => {
      const onSubmit = vi.fn();
      render(<HouseholdFormDialog initial={pending} onSubmit={onSubmit} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/statut/i), { target: { value: "CONFIRMED" } });
      fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
      fireEvent.change(screen.getByLabelText(/personnes confirmées/i), { target: { value: "2" } });
      fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        displayName: "Famille Rakoto",
        allocatedSeats: 4,
        memberNames: [],
        status: "CONFIRMED",
        dietaryNotes: "",
        confirmedCount: 2,
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("refuses a count the admin blanked out on an already-confirmed household", () => {
      const onSubmit = vi.fn();
      render(<HouseholdFormDialog initial={existing} onSubmit={onSubmit} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/personnes confirmées/i), { target: { value: "" } });
      fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/au moins une personne/i);
    });

    // Invariant 3: confirmedCount <= allocatedSeats. This one is already held
    // by max={allocatedSeats} — native constraint validation refuses the submit
    // and shows the browser's own localised message — so this test passed
    // before any change was made. It is here to keep that attribute honest: drop
    // `max` and the dialog starts posting counts the API will reject.
    it("cannot submit a count above the allocated seats", () => {
      const onSubmit = vi.fn();
      render(<HouseholdFormDialog initial={existing} onSubmit={onSubmit} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/personnes confirmées/i), { target: { value: "5" } });
      fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/personnes confirmées/i)).toHaveAttribute("max", "4");
    });

    it("flags the invalid field to assistive tech, not by colour alone", () => {
      render(<HouseholdFormDialog initial={pending} onSubmit={vi.fn()} onClose={() => {}} />);

      fireEvent.change(screen.getByLabelText(/statut/i), { target: { value: "CONFIRMED" } });
      fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

      const field = screen.getByLabelText(/personnes confirmées/i);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription(/au moins une personne/i);
    });
  });
});
