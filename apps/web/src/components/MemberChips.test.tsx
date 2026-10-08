import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberChips } from "./MemberChips";

describe("MemberChips", () => {
  it("lists every member by full name", () => {
    render(<MemberChips names={["Tiana Andriamanana", "Soa Andriamanana"]} label="Membres de Famille A" />);
    const liste = screen.getByRole("list", { name: "Membres de Famille A" });
    const elements = within(liste).getAllByRole("listitem");
    expect(elements).toHaveLength(2);
    expect(elements[0]).toHaveTextContent("Tiana Andriamanana");
  });

  // L'initiale est un ornement : un lecteur d'écran ne doit pas lire
  // « T Tiana Andriamanana ».
  it("draws the initial without reading it aloud", () => {
    render(<MemberChips names={["Tiana Andriamanana"]} label="Membres" />);
    const pastille = screen.getByText("T");
    expect(pastille).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("listitem")).toHaveTextContent(/^TTiana Andriamanana$/);
  });

  it("skips blank names", () => {
    render(<MemberChips names={["Fara", "  "]} label="Membres" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("renders nothing when there is no member", () => {
    const { container } = render(<MemberChips names={[]} label="Membres" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lets the caller lay the list out", () => {
    render(<MemberChips names={["Fara"]} label="Membres" className="md:flex-col" />);
    expect(screen.getByRole("list", { name: "Membres" })).toHaveClass("flex-wrap", "md:flex-col");
  });

  it("is a round pill, on the design tokens", () => {
    render(<MemberChips names={["Fara"]} label="Membres" />);
    expect(screen.getByRole("listitem").className).toContain("rounded-full");
  });
});
