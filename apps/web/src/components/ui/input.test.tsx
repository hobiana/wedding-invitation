import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./field";
import { Input } from "./input";

describe("Input", () => {
  it("draws its border from the only token that clears 3:1 on ivory and cream", () => {
    render(<Input aria-label="Nom" />);
    expect(screen.getByLabelText("Nom").className).toContain("border-rule-strong");
  });

  it("uses the control radius rather than an ad-hoc one", () => {
    render(<Input aria-label="Nom" />);
    const className = screen.getByLabelText("Nom").className;
    expect(className).toContain("rounded-control");
    expect(className).not.toMatch(/rounded-(md|lg|sm|full|xl)\b/);
  });

  // index.css already paints :focus-visible in bordeaux-700. A primitive that
  // suppressed the outline — the reflex shadcn habit — would silently remove
  // the only focus indicator in the app and take the gold-free ring with it.
  it("never suppresses the outline the base layer provides", () => {
    render(<Input aria-label="Nom" />);
    expect(screen.getByLabelText("Nom").className).not.toContain("outline-none");
  });

  it("keeps text at 16px so iOS Safari does not zoom on focus", () => {
    render(<Input aria-label="Nom" />);
    expect(screen.getByLabelText("Nom").className).toContain("text-base");
  });

  it("aligns digits with tabular figures on a numeric field", () => {
    render(<Input type="number" aria-label="Places" />);
    expect(screen.getByLabelText("Places").className).toContain("tabular-nums");
  });

  it("leaves proportional figures on a text field", () => {
    render(<Input aria-label="Nom" />);
    expect(screen.getByLabelText("Nom").className).not.toContain("tabular-nums");
  });

  it("forwards a ref to the underlying element so forms can focus it", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Nom" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  // Letting the control's own id through detached the `<label for=…>`, which
  // still pointed at the generated id. The field owns the id precisely so this
  // cannot happen; the id belongs on <Field>.
  it("keeps the label attached even when a caller puts an id on the control", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Field label="Nom">
        <Input id="chosenByCaller" />
      </Field>,
    );
    expect(screen.getByLabelText("Nom")).toBeInstanceOf(HTMLInputElement);
    warn.mockRestore();
  });

  it("warns the developer that an id on the control is being ignored", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Field label="Nom">
        <Input id="chosenByCaller" />
      </Field>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("chosenByCaller"));
    warn.mockRestore();
  });

  it("keeps its own aria-describedby alongside the one Field contributes", () => {
    render(
      <>
        <span id="extra">Note externe</span>
        <Field label="Nom" error="Champ requis">
          <Input aria-describedby="extra" />
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Nom")).toHaveAccessibleDescription("Note externe Champ requis");
  });

  it("merges a caller className without dropping the token classes", () => {
    render(<Input aria-label="Nom" className="w-full" />);
    const className = screen.getByLabelText("Nom").className;
    expect(className).toContain("w-full");
    expect(className).toContain("border-rule-strong");
  });
});
