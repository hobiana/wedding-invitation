import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("shares the control border token with the other inputs", () => {
    render(<Textarea aria-label="Message" />);
    expect(screen.getByLabelText("Message").className).toContain("border-rule-strong");
  });

  it("uses the control radius rather than an ad-hoc one", () => {
    const { container } = render(<Textarea aria-label="Message" />);
    expect(container.querySelector("textarea")!.className).toContain("rounded-control");
  });

  it("never suppresses the outline the base layer provides", () => {
    render(<Textarea aria-label="Message" />);
    expect(screen.getByLabelText("Message").className).not.toContain("outline-none");
  });

  it("keeps text at 16px so iOS Safari does not zoom on focus", () => {
    render(<Textarea aria-label="Message" />);
    expect(screen.getByLabelText("Message").className).toContain("text-base");
  });

  it("forwards a ref to the underlying element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="Message" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("takes the invalid state and description from the Field around it", () => {
    render(
      <Field label="Régime alimentaire" error="Trop long">
        <Textarea />
      </Field>,
    );
    const control = screen.getByLabelText("Régime alimentaire");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAccessibleDescription("Trop long");
  });

  // A textarea that starts one line tall invites a one-word answer; dietary
  // notes and messages to the couple are the two places guests write prose.
  it("opens on more than a single row", () => {
    render(<Textarea aria-label="Message" />);
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).rows).toBeGreaterThan(1);
  });

  it("lets the caller override the row count", () => {
    render(<Textarea aria-label="Message" rows={8} />);
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).rows).toBe(8);
  });
});
