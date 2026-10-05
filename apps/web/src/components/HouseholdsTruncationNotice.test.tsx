import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HouseholdsTruncationNotice } from "./HouseholdsTruncationNotice";

describe("HouseholdsTruncationNotice", () => {
  it("says nothing when every household was received", () => {
    const { container } = render(
      <HouseholdsTruncationNotice recus={40} total={40} consequence="les chiffres affichés sont incomplets" />,
    );
    // Rendu vide, et pas seulement invisible : un avertissement caché resterait
    // lu par un lecteur d'écran.
    expect(container).toBeEmptyDOMElement();
  });

  it("warns in French, with both numbers, when the list was cut", () => {
    render(
      <HouseholdsTruncationNotice recus={500} total={612} consequence="les chiffres affichés sont incomplets" />,
    );
    const alerte = screen.getByRole("alert");
    expect(alerte).toHaveTextContent(
      "Seuls les 500 premiers foyers sur 612 sont pris en compte : les chiffres affichés sont incomplets.",
    );
  });
});
