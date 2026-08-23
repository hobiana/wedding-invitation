import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Select } from "./select";

const options = (
  <>
    <option value="PENDING">En attente</option>
    <option value="CONFIRMED">Confirmé</option>
    <option value="DECLINED">Décliné</option>
  </>
);

describe("Select", () => {
  it("shares the control border token with the other inputs", () => {
    render(<Select aria-label="Statut">{options}</Select>);
    expect(screen.getByLabelText("Statut").className).toContain("border-rule-strong");
  });

  it("uses the control radius rather than an ad-hoc one", () => {
    render(<Select aria-label="Statut">{options}</Select>);
    expect(screen.getByLabelText("Statut").className).toContain("rounded-control");
  });

  it("never suppresses the outline the base layer provides", () => {
    render(<Select aria-label="Statut">{options}</Select>);
    expect(screen.getByLabelText("Statut").className).not.toContain("outline-none");
  });

  it("keeps text at 16px so iOS Safari does not zoom on focus", () => {
    render(<Select aria-label="Statut">{options}</Select>);
    expect(screen.getByLabelText("Statut").className).toContain("text-base");
  });

  it("forwards a ref to the underlying element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} aria-label="Statut">
        {options}
      </Select>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("renders the options it is given", () => {
    render(<Select aria-label="Statut">{options}</Select>);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("takes the invalid state and description from the Field around it", () => {
    render(
      <Field label="Statut" error="Statut inconnu">
        <Select>{options}</Select>
      </Field>,
    );
    const control = screen.getByLabelText("Statut");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAccessibleDescription("Statut inconnu");
  });

  // A native select on iOS renders the OS wheel; keeping the element native is
  // what makes it keyboard- and screen-reader-correct for free. This test fails
  // the day someone swaps it for a div-based listbox.
  it("stays a native select element", () => {
    const { container } = render(<Select aria-label="Statut">{options}</Select>);
    expect(container.querySelector("select")).not.toBeNull();
  });
});
