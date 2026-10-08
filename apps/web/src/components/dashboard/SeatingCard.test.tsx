import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { RsvpStatus, TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import { SeatingCard, type SeatingCardProps } from "./SeatingCard";

function h(id: string, status: RsvpStatus, allocatedSeats: number, confirmedCount: number | null): TableHouseholdSummaryDto {
  return { id, displayName: `Foyer ${id}`, status, allocatedSeats, confirmedCount };
}

// Table 1 pleine : un confirmé de 4 + un en attente de 6. Table 2 : un en
// attente de 3. Hors table : un en attente de 5, un confirmé partiel (2 sur 4)
// et un décliné — qui n'est pas « à placer ».
const T1: TableDto = { id: "t1", name: "Table 1", capacity: 10, households: [h("a", "CONFIRMED", 4, 4), h("b", "PENDING", 6, null)] };
const T2: TableDto = { id: "t2", name: "Table 2", capacity: 10, households: [h("c", "PENDING", 3, null)] };
const FOYERS = [
  h("a", "CONFIRMED", 4, 4),
  h("b", "PENDING", 6, null),
  h("c", "PENDING", 3, null),
  h("d", "PENDING", 5, null),
  h("e", "CONFIRMED", 4, 2),
  h("f", "DECLINED", 4, 0),
];

function rendre(props: Partial<SeatingCardProps> = {}) {
  return render(
    <MemoryRouter>
      <SeatingCard tables={[T1, T2]} foyers={FOYERS} {...props} />
    </MemoryRouter>,
  );
}

function valeur(etiquette: string) {
  return screen.getByText(etiquette, { selector: "dt" }).closest("div")!.querySelector("dd")!.textContent;
}

describe("SeatingCard", () => {
  it("counts seats placed, seats to place and free chairs, from the plan's own rules", () => {
    rendre();
    expect(screen.getByRole("heading", { name: "Plan de table" })).toBeInTheDocument();
    expect(valeur("placés")).toBe("13");
    // 5 + 2 : un confirmé partiel compte pour ceux qui viennent ; le décliné ne compte pas.
    expect(valeur("à placer")).toBe("7");
    expect(valeur("chaises libres")).toBe("7");
  });

  it("sums up the tables and how many are full", () => {
    rendre();
    expect(screen.getByText("2 tables, 20 chaises · 1 table complète")).toBeInTheDocument();
  });

  it("leaves the full tables out when none is", () => {
    rendre({ tables: [T2] });
    expect(screen.getByText("1 table, 10 chaises")).toBeInTheDocument();
  });

  it("opens the seating plan", () => {
    rendre();
    const lien = screen.getByRole("link", { name: "Ouvrir le plan de table" });
    expect(lien).toHaveAttribute("href", "/admin/tables");
    expect(lien).toHaveTextContent("Ouvrir");
  });

  it("says when no table exists yet", () => {
    rendre({ tables: [] });
    expect(screen.getByText("Aucune table pour l'instant")).toBeInTheDocument();
    expect(valeur("chaises libres")).toBe("0");
  });

  // Une table qui déborde (capacité réduite à la main) ne fait pas de chaises négatives.
  it("never shows negative free chairs", () => {
    const pleine: TableDto = { ...T1, capacity: 8 };
    rendre({ tables: [pleine] });
    expect(valeur("chaises libres")).toBe("0");
  });
});
