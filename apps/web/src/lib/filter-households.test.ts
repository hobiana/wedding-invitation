import type { HouseholdAdminDto } from "@invitation-app/shared";
import { describe, expect, it } from "vitest";
import { filterHouseholds } from "./filter-households";

function foyer(partiel: Partial<HouseholdAdminDto>): HouseholdAdminDto {
  return {
    id: "a1",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: [],
    status: "PENDING",
    confirmedCount: null,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...partiel,
  };
}

const FOYERS = [
  foyer({ id: "a1", displayName: "Rakotomavo", status: "CONFIRMED", confirmedCount: 4 }),
  foyer({ id: "b2", displayName: "Andriamanana", memberNames: ["Fara", "Naina"] }),
  foyer({ id: "c3", displayName: "Rasoanaivo", status: "DECLINED", confirmedCount: 0 }),
];

describe("filterHouseholds", () => {
  it("returns everything when nothing is asked", () => {
    expect(filterHouseholds(FOYERS, { query: "", status: "ALL" })).toHaveLength(3);
  });

  it("matches a household name whatever the case", () => {
    const trouve = filterHouseholds(FOYERS, { query: "rakoto", status: "ALL" });
    expect(trouve.map((f) => f.id)).toEqual(["a1"]);
  });

  // On cherche souvent un invité par son prénom, pas par le nom du foyer.
  it("matches a member's first name", () => {
    const trouve = filterHouseholds(FOYERS, { query: "Naina", status: "ALL" });
    expect(trouve.map((f) => f.id)).toEqual(["b2"]);
  });

  // Les noms malgaches et français portent des accents, et personne ne les
  // tape dans un champ de recherche.
  it("ignores accents on both sides", () => {
    const avecAccent = [foyer({ id: "d4", displayName: "Ratsimbazafy Éric" })];
    expect(filterHouseholds(avecAccent, { query: "eric", status: "ALL" })).toHaveLength(1);
    expect(filterHouseholds(avecAccent, { query: "éric", status: "ALL" })).toHaveLength(1);
  });

  it("filters by status", () => {
    expect(filterHouseholds(FOYERS, { query: "", status: "PENDING" }).map((f) => f.id)).toEqual([
      "b2",
    ]);
  });

  it("combines the two", () => {
    expect(filterHouseholds(FOYERS, { query: "ra", status: "DECLINED" }).map((f) => f.id)).toEqual([
      "c3",
    ]);
  });

  it("ignores surrounding spaces in the query", () => {
    expect(filterHouseholds(FOYERS, { query: "  rakoto  ", status: "ALL" })).toHaveLength(1);
  });
});
