import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RsvpForm } from "./RsvpForm";

describe("RsvpForm", () => {
  it("caps the confirmed guest count at allocatedSeats", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/nombre de personnes/i) as HTMLInputElement;
    expect(input.max).toBe("2");
  });

  it("submits DECLINED status when clicking the decline button", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /je ne viendrai pas/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "DECLINED" }));
  });

  // An empty string is not null, so the dashboard's dietary-notes count treated
  // every untouched textarea as a dietary requirement.
  it("omits dietaryNotes entirely when the textarea was left blank", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /je viens/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CONFIRMED", dietaryNotes: undefined }),
    );
  });

  it("omits dietaryNotes when the textarea holds only whitespace", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/régime alimentaire/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /je viens/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dietaryNotes: undefined }));
  });

  it("sends the trimmed note when the guest actually wrote one", () => {
    const onSubmit = vi.fn();
    render(<RsvpForm allocatedSeats={2} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/régime alimentaire/i), {
      target: { value: "  Végétarien  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /je viens/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ dietaryNotes: "Végétarien" }),
    );
  });
});
