import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsesCard } from "./ResponsesCard";

/** La valeur affichée sous une étiquette du tableau de la carte. */
function valeur(etiquette: string) {
  return screen.getByText(etiquette, { selector: "dt" }).closest("div")!.querySelector("dd")!.textContent;
}

describe("ResponsesCard", () => {
  it("counts the households by answer, each with its word", () => {
    render(<ResponsesCard confirmes={28} declines={6} enAttente={8} total={42} />);
    expect(screen.getByRole("heading", { name: "Réponses" })).toBeInTheDocument();
    expect(valeur("confirmés")).toBe("28");
    expect(valeur("déclinés")).toBe("6");
    expect(valeur("en attente")).toBe("8");
  });

  it("gives the answer rate, and the sentence behind it", () => {
    render(<ResponsesCard confirmes={28} declines={6} enAttente={8} total={42} />);
    expect(screen.getByText(/^81\s%$/)).toBeInTheDocument();
    expect(screen.getByText("34 / 42 foyers")).toBeInTheDocument();
    expect(screen.getByText("34 foyers sur 42 ont répondu")).toBeInTheDocument();
  });

  // « 1 foyers ont répondu » : la faute que produit le premier foyer qui répond.
  it("agrees every word with a single household", () => {
    render(<ResponsesCard confirmes={1} declines={1} enAttente={60} total={62} />);
    expect(screen.getByText("confirmé", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("décliné", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("2 foyers sur 62 ont répondu")).toBeInTheDocument();
  });

  it("agrees the sentence with a single answer", () => {
    render(<ResponsesCard confirmes={1} declines={0} enAttente={61} total={62} />);
    expect(screen.getByText("1 foyer sur 62 a répondu")).toBeInTheDocument();
  });

  it("reads zero, never NaN, before any household exists", () => {
    const { container } = render(<ResponsesCard confirmes={0} declines={0} enAttente={0} total={0} />);
    expect(screen.getByText(/^0\s%$/)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("NaN");
  });
});
