import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PageSizeSelect } from "./page-size-select";

describe("PageSizeSelect", () => {
  it("offers 10, 25, 50 and 100 behind a real, visible label", () => {
    render(<PageSizeSelect value={25} onChange={() => {}} />);
    const taille = screen.getByLabelText("Par page") as HTMLSelectElement;
    expect(taille).toHaveValue("25");
    expect(Array.from(taille.options).map((o) => o.value)).toEqual(["10", "25", "50", "100"]);
    // Le libellé est un vrai <label> visible, pas un aria-label.
    expect(screen.getByText("Par page").tagName).toBe("LABEL");
  });

  it("reports the chosen size as a number", async () => {
    const utilisateur = userEvent.setup();
    const onChange = vi.fn();
    render(<PageSizeSelect value={25} onChange={onChange} />);
    await utilisateur.selectOptions(screen.getByLabelText("Par page"), "50");
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("is rounded like the other fields of the page", () => {
    render(<PageSizeSelect value={10} onChange={() => {}} />);
    const taille = screen.getByLabelText("Par page");
    expect(taille).toHaveClass("rounded-field");
    expect(taille).not.toHaveClass("rounded-control");
  });
});
