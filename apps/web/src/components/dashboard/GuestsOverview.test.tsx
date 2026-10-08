import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";
import { GuestsOverview, type GuestsOverviewProps } from "./GuestsOverview";

type Compte = Pick<HouseholdAdminDto, "status" | "allocatedSeats" | "confirmedCount">;

function f(status: RsvpStatus, allocatedSeats: number, confirmedCount: number | null): Compte {
  return { status, allocatedSeats, confirmedCount };
}
const n = <T,>(k: number, v: T): T[] => Array.from({ length: k }, () => v);

/**
 * Le jeu de la maquette : 42 foyers, 58 confirmées + 21 en attente + 33
 * déclinées = 112 prévues. Les 33 déclinées : 24 par 6 foyers qui ne viennent
 * pas, 9 par 4 foyers qui viennent en partie.
 */
const MAQUETTE: Compte[] = [
  ...n(6, f("DECLINED", 4, 0)),
  ...[5, 4, 4, 2, 2, 2, 1, 1].map((s) => f("PENDING", s, null)),
  f("CONFIRMED", 4, 1),
  f("CONFIRMED", 4, 1),
  f("CONFIRMED", 4, 2),
  f("CONFIRMED", 2, 1),
  ...n(3, f("CONFIRMED", 5, 5)),
  ...n(19, f("CONFIRMED", 2, 2)),
];

function rendre(props: Partial<GuestsOverviewProps> = {}) {
  return render(
    <MemoryRouter>
      <GuestsOverview
        foyers={MAQUETTE}
        seuil={120}
        foyersInvites={42}
        foyersEnAttente={8}
        regimesParticuliers={7}
        {...props}
      />
    </MemoryRouter>,
  );
}

/** La colonne de légende qui porte cette étiquette, en texte. */
function colonne(etiquette: string) {
  return screen.getByText(etiquette, { selector: "dt" }).closest("div")!.textContent;
}

describe("GuestsOverview", () => {
  it("leads with the confirmed guests", () => {
    rendre();
    expect(screen.getByRole("heading", { name: "58 invités confirmés" })).toBeInTheDocument();
  });

  it("names each part of the bar in words, with its seats and what it means", () => {
    rendre();
    expect(colonne("Confirmées")).toContain("58 places");
    expect(colonne("Confirmées")).toContain("Le chiffre à donner au traiteur.");
    expect(colonne("En attente")).toContain("21 places");
    expect(colonne("En attente")).toContain("Les places des 8 foyers qui n'ont pas encore répondu.");
    expect(colonne("Déclinées")).toContain("33 places");
    expect(colonne("Déclinées")).toContain(
      "24 par les 6 foyers qui ne viennent pas, 9 par des foyers qui viennent en partie.",
    );
    expect(colonne("Prévues")).toContain("112 places");
    expect(colonne("Prévues")).toContain("Le total des places accordées aux 42 foyers invités.");
  });

  // La barre ne porte pas le sens seule : ses segments se distinguent mal
  // (1,26:1 entre statuts), la légende nommée le porte.
  it("keeps the stacked bar out of the accessibility tree", () => {
    const { container } = rendre();
    const barre = container.querySelector("[data-barre]")!;
    expect(barre).toHaveAttribute("aria-hidden", "true");
    const largeurs = [...barre.querySelectorAll("[data-segment]")].map((s) => (s as HTMLElement).style.width);
    // Seuil non atteint : l'échelle est le seuil, 120.
    expect(largeurs.map((l) => Number.parseFloat(l).toFixed(1))).toEqual(["48.3", "17.5", "27.5"]);
  });

  describe("le seuil", () => {
    it("says how many seats remain below the threshold, and marks it with a line and words", () => {
      const { container } = rendre({ seuil: 120 });
      expect(screen.getByText("Encore 8 places à accorder avant le seuil de 120 invités")).toBeInTheDocument();
      expect(screen.getByText("Seuil max · 120")).toBeInTheDocument();
      expect((container.querySelector("[data-seuil]") as HTMLElement).style.left).toBe("100%");
    });

    // La capture du commanditaire : 112 prévues pour un seuil de 40.
    it("warns in brick red, with a dot and words, when the seats exceed it", () => {
      const { container } = rendre({ seuil: 40 });
      const message = screen.getByText("72 places prévues au-delà du seuil de 40 invités");
      expect(message.closest("p")).toHaveClass("text-danger");
      expect(message.closest("p")!.querySelector("[data-puce]")).not.toBeNull();
      const repere = container.querySelector("[data-seuil]") as HTMLElement;
      expect(Number.parseFloat(repere.style.left)).toBeCloseTo(35.71, 1);
      expect(screen.getByText("Seuil max · 40")).toBeInTheDocument();
    });

    it("says the threshold is reached when the seats equal it", () => {
      rendre({ seuil: 112 });
      expect(screen.getByText("Seuil de 112 invités atteint")).toBeInTheDocument();
    });

    // Seuil facultatif : sans lui, ni repère ni message.
    it("shows neither marker nor message without a threshold", () => {
      const { container } = rendre({ seuil: null });
      expect(screen.queryByText(/seuil/i)).toBeNull();
      expect(container.querySelector("[data-seuil]")).toBeNull();
    });
  });

  describe("le pied", () => {
    it("counts the households coming in fewer, and the dietary notes with a way to them", () => {
      rendre();
      expect(screen.getByText("4 foyers viennent à moins que prévu")).toBeInTheDocument();
      expect(screen.getByText(/7 régimes particuliers, détail dans/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Foyers" })).toHaveAttribute("href", "/admin/households");
    });

    // « 0 régime particulier » resterait affiché pour toujours tant que le champ
    // n'est pas au formulaire admin (décision 7) : on ne l'affiche qu'au-dessus de 0.
    it("leaves out what is zero", () => {
      rendre({ foyers: [f("CONFIRMED", 2, 2)], regimesParticuliers: 0 });
      expect(screen.queryByText(/régime/)).toBeNull();
      expect(screen.queryByText(/moins que prévu/)).toBeNull();
    });

    it("agrees a single household and a single note", () => {
      rendre({ foyers: [f("CONFIRMED", 4, 2)], regimesParticuliers: 1 });
      expect(screen.getByText("1 foyer vient à moins que prévu")).toBeInTheDocument();
      expect(screen.getByText(/1 régime particulier, détail dans/)).toBeInTheDocument();
    });
  });

  // Un dépôt fraîchement installé : aucun foyer, aucune largeur NaN.
  it("stays whole before any household exists", () => {
    const { container } = rendre({ foyers: [], foyersInvites: 0, foyersEnAttente: 0, seuil: null });
    expect(screen.getByRole("heading", { name: "0 invité confirmé" })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("NaN");
    expect(colonne("Déclinées")).toContain("Aucune place perdue pour l'instant.");
  });
});
