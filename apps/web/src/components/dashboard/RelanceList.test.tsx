import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { RelanceList } from "./RelanceList";

function foyer(partiel: Partial<HouseholdAdminDto>): HouseholdAdminDto {
  return {
    id: "h1",
    displayName: "Famille Rakoto",
    allocatedSeats: 4,
    memberNames: [],
    status: "PENDING",
    confirmedCount: null,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partiel,
  };
}

function lignes() {
  return within(screen.getByRole("region", { name: "À relancer" })).getAllByRole("listitem");
}

describe("RelanceList", () => {
  it("lists only the households that have not answered", () => {
    render(
      <RelanceList
        foyers={[
          foyer({ id: "c", displayName: "Famille Confirmée", status: "CONFIRMED", confirmedCount: 2 }),
          foyer({ id: "d", displayName: "Famille Déclinée", status: "DECLINED", confirmedCount: 0 }),
          foyer({ id: "p", displayName: "Famille Silencieuse" }),
        ]}
      />,
    );
    expect(lignes()).toHaveLength(1);
    expect(lignes()[0]).toHaveTextContent("Famille Silencieuse");
  });

  // Le sous-titre de la maquette le dit : les plus grands foyers en premier.
  it("puts the largest households first", () => {
    render(
      <RelanceList
        foyers={[
          foyer({ id: "a", displayName: "Tante Hanta", allocatedSeats: 1 }),
          foyer({ id: "b", displayName: "Famille Ravelo", allocatedSeats: 5 }),
          foyer({ id: "c", displayName: "Camille Petit", allocatedSeats: 2 }),
        ]}
      />,
    );
    expect(lignes().map((l) => l.querySelector("p")!.textContent)).toEqual([
      "Famille Ravelo",
      "Camille Petit",
      "Tante Hanta",
    ]);
  });

  it("says how many households and seats are at stake", () => {
    render(
      <RelanceList
        foyers={[foyer({ id: "a", allocatedSeats: 5 }), foyer({ id: "b", allocatedSeats: 4 })]}
      />,
    );
    expect(
      screen.getByText("2 foyers, 9 places en jeu · les plus grands foyers en premier"),
    ).toBeInTheDocument();
  });

  it("agrees the subtitle with a single household", () => {
    render(<RelanceList foyers={[foyer({ allocatedSeats: 1 })]} />);
    expect(screen.getByText("1 foyer, 1 place en jeu · les plus grands foyers en premier")).toBeInTheDocument();
  });

  // Les places accordées, et jamais `confirmedCount` : il est `null` tant que
  // le foyer n'a pas répondu, et « 0 » dirait « personne ne vient ».
  it("shows the allocated seats, never a zero for a silent household", () => {
    render(<RelanceList foyers={[foyer({ allocatedSeats: 4, confirmedCount: null })]} />);
    expect(lignes()[0]).toHaveTextContent("4 places");
    expect(lignes()[0]).not.toHaveTextContent(/\b0\b/);
  });

  it("offers the copy gesture beside each household to chase", () => {
    render(<RelanceList foyers={[foyer({ id: "aZ3k9Lm2", displayName: "Rakotomavo" })]} />);
    expect(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ })).toBeInTheDocument();
  });

  // Deux vides, deux phrases : « personne à relancer » est une bonne nouvelle,
  // « aucun foyer saisi » est un travail qui reste à faire.
  it("distinguishes an empty guest list from a list where everybody answered", () => {
    const { rerender } = render(<RelanceList foyers={[]} />);
    expect(screen.getByText("Aucun foyer")).toBeInTheDocument();
    rerender(<RelanceList foyers={[foyer({ status: "CONFIRMED", confirmedCount: 4 })]} />);
    expect(screen.getByText("Aucun foyer en attente")).toBeInTheDocument();
  });
});
