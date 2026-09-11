import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "./SectionHeading";

describe("SectionHeading", () => {
  it("is a real second-level heading, so the page has an outline", () => {
    render(<SectionHeading id="le-jour-j">Le jour J</SectionHeading>);

    const heading = screen.getByRole("heading", { level: 2, name: "Le jour J" });
    expect(heading).toHaveAttribute("id", "le-jour-j");
  });

  // Le filet structure l'œil ; il n'ajoute pas un mot à ce que le titre dit
  // déjà, et un lecteur d'écran qui l'annoncerait couperait la lecture pour
  // rien. Le test porte sur ce silence, pas sur le dessin — le dessin a déjà
  // changé une fois, du lamba au trait d'or, sans que rien ici ne bouge.
  it("carries a decorative rule that assistive technology never announces", () => {
    const { container } = render(<SectionHeading id="x">Votre réponse</SectionHeading>);

    const rule = container.querySelector("[aria-hidden='true']");
    expect(rule).not.toBeNull();
    expect(rule).toHaveTextContent("");
  });
});
