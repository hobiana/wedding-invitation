import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { HouseholdFormDialog } from "./HouseholdFormDialog";

const existing: HouseholdAdminDto = {
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
};

describe("HouseholdFormDialog", () => {
  it("submits displayName and allocatedSeats", () => {
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/nom du foyer/i), { target: { value: "Famille Rakoto" } });
    fireEvent.change(screen.getByLabelText(/nombre de places/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith({ displayName: "Famille Rakoto", allocatedSeats: 4 });
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
      status: "CONFIRMED",
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
      status: "PENDING",
    });
  });
});
