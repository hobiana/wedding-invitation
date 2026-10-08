import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";
import { GuestMessages } from "./GuestMessages";

type AvecMot = Pick<HouseholdAdminDto, "id" | "displayName" | "status" | "message" | "updatedAt">;

function mot(id: string, message: string | null, updatedAt: string, status: RsvpStatus = "CONFIRMED"): AvecMot {
  return { id, displayName: `Famille ${id}`, status, message, updatedAt };
}

function citations() {
  return within(screen.getByRole("region", { name: "Mots des invités" })).getAllByRole("figure");
}

describe("GuestMessages", () => {
  it("quotes the words the households left, in French quotation marks", () => {
    render(<GuestMessages foyers={[mot("Rasoanaivo", "On a déjà réservé le train !", "2026-10-01T10:00:00Z")]} />);
    expect(screen.getByText("Les messages laissés en répondant")).toBeInTheDocument();
    const [citation] = citations();
    expect(citation.querySelector("blockquote")).toHaveTextContent("« On a déjà réservé le train ! »");
    expect(citation).toHaveTextContent("Famille Rasoanaivo · confirmé");
  });

  // Le statut se lit en français, jamais le `DECLINED` du contrat.
  it("names the answer in French", () => {
    render(
      <GuestMessages
        foyers={[
          mot("a", "Désolés", "2026-10-03T10:00:00Z", "DECLINED"),
          mot("b", "Un mot", "2026-10-02T10:00:00Z", "PENDING"),
        ]}
      />,
    );
    const [decline, attente] = citations();
    expect(decline).toHaveTextContent("Famille a · décliné");
    expect(attente).toHaveTextContent("Famille b · en attente");
    expect(screen.queryByText(/DECLINED|PENDING/)).toBeNull();
  });

  it("keeps the four most recent words, newest first", () => {
    render(
      <GuestMessages
        foyers={[
          mot("ancien", "Le plus ancien", "2026-09-01T10:00:00Z"),
          mot("vide", "   ", "2026-10-09T10:00:00Z"),
          mot("d", "d", "2026-10-04T10:00:00Z"),
          mot("a", "a", "2026-10-07T10:00:00Z"),
          mot("c", "c", "2026-10-05T10:00:00Z"),
          mot("b", "b", "2026-10-06T10:00:00Z"),
        ]}
      />,
    );
    expect(citations().map((c) => c.querySelector("figcaption")!.textContent)).toEqual([
      "Famille a · confirmé",
      "Famille b · confirmé",
      "Famille c · confirmé",
      "Famille d · confirmé",
    ]);
  });

  it("says so when nobody has left a word yet", () => {
    render(<GuestMessages foyers={[mot("a", null, "2026-10-01T10:00:00Z")]} />);
    expect(screen.getByText("Aucun mot pour l'instant.")).toBeInTheDocument();
  });
});
