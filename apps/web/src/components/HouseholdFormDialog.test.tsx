import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HouseholdFormDialog } from "./HouseholdFormDialog";

describe("HouseholdFormDialog", () => {
  it("submits displayName and allocatedSeats", () => {
    const onSubmit = vi.fn();
    render(<HouseholdFormDialog onSubmit={onSubmit} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText(/nom du foyer/i), { target: { value: "Famille Rakoto" } });
    fireEvent.change(screen.getByLabelText(/nombre de places/i), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(onSubmit).toHaveBeenCalledWith({ displayName: "Famille Rakoto", allocatedSeats: 4 });
  });
});
