import { describe, expect, it } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import type { TableDto, TableHouseholdSummaryDto } from "@invitation-app/shared";
import {
  bilan,
  capaciteValide,
  choixDeTable,
  dragEndTarget,
  etatDeTable,
  foyersAPlacer,
  issueDuGlisser,
  peutAccueillir,
  placesLibresDe,
} from "./plan-de-table";

function foyer(partiel: Partial<TableHouseholdSummaryDto> = {}): TableHouseholdSummaryDto {
  return { id: "h", displayName: "Famille", allocatedSeats: 4, confirmedCount: 4, status: "CONFIRMED", ...partiel };
}
function table(partiel: Partial<TableDto> = {}): TableDto {
  return { id: "t", name: "Table", capacity: 8, households: [], ...partiel };
}

function dragEvent(overId: string | null): DragEndEvent {
  return {
    active: { id: "h1" },
    over: overId === null ? null : { id: overId },
  } as DragEndEvent;
}

// Déplacé de `TableBoard.test.tsx` avec la fonction : le glisser de dnd-kit ne
// tourne pas sous jsdom, ses trois issues se testent donc ici.
describe("dragEndTarget", () => {
  it("means nothing when dropped on dead space or cancelled", () => {
    expect(dragEndTarget(dragEvent(null))).toBeNull();
  });

  it("unassigns when dropped on « À placer »", () => {
    expect(dragEndTarget(dragEvent("unassigned"))).toEqual({ householdId: "h1", tableId: null });
  });

  it("assigns when dropped on a table", () => {
    expect(dragEndTarget(dragEvent("t1"))).toEqual({ householdId: "h1", tableId: "t1" });
  });
});

describe("placesLibresDe", () => {
  // Invariant : un foyer sans réponse occupe toute son allocation, jamais 0.
  it("counts a pending household at its full allocation", () => {
    const t = table({ households: [foyer({ status: "PENDING", confirmedCount: null, allocatedSeats: 3 })] });
    expect(placesLibresDe(t)).toBe(5);
  });

  it("goes negative when a table is over capacity", () => {
    expect(placesLibresDe(table({ capacity: 3, households: [foyer()] }))).toBe(-1);
  });
});

describe("peutAccueillir", () => {
  it("accepts a household that fits exactly", () => {
    expect(peutAccueillir(table({ capacity: 4 }), foyer())).toBe(true);
  });

  it("refuses a household one seat too large", () => {
    expect(peutAccueillir(table({ capacity: 3 }), foyer())).toBe(false);
  });
});

describe("choixDeTable", () => {
  it("says a table with enough room is available", () => {
    expect(choixDeTable(table({ capacity: 8 }), foyer())).toEqual({ etat: "disponible", libres: 8 });
  });

  it("says a table with some room but not enough is too small", () => {
    expect(choixDeTable(table({ capacity: 3 }), foyer())).toEqual({ etat: "trop-petite", libres: 3 });
  });

  it("says a table without any room is full", () => {
    expect(choixDeTable(table({ capacity: 4, households: [foyer({ id: "x" })] }), foyer())).toEqual({
      etat: "complete",
      libres: 0,
    });
  });
});

describe("foyersAPlacer", () => {
  const assis = foyer({ id: "assis" });
  const tables = [table({ households: [assis] })];

  it("keeps the unseated households in the order received", () => {
    const liste = [foyer({ id: "b" }), assis, foyer({ id: "a" })];
    expect(foyersAPlacer(liste, tables).map((f) => f.id)).toEqual(["b", "a"]);
  });

  // Décision du commanditaire : un foyer qui a décliné ne se place pas.
  it("hides a household that declined", () => {
    const liste = [foyer({ id: "non", status: "DECLINED", confirmedCount: 0 }), foyer({ id: "oui" })];
    expect(foyersAPlacer(liste, tables).map((f) => f.id)).toEqual(["oui"]);
  });

  it("keeps a household that has not answered yet", () => {
    const liste = [foyer({ id: "p", status: "PENDING", confirmedCount: null })];
    expect(foyersAPlacer(liste, tables)).toHaveLength(1);
  });
});

describe("etatDeTable", () => {
  const petite = table({ id: "petite", capacity: 2 });
  const grande = table({ id: "grande", capacity: 10 });

  it("leaves every table at rest when no household is being placed", () => {
    expect(etatDeTable(grande, null)).toBe("repos");
  });

  it("highlights a table the household fits in, and dims one it does not", () => {
    const enJeu = { foyer: foyer(), depuis: null };
    expect(etatDeTable(grande, enJeu)).toBe("accueille");
    expect(etatDeTable(petite, enJeu)).toBe("trop-petite");
  });

  // Glisser un foyer assis : sa propre table n'est ni une cible ni un refus.
  it("leaves the table a dragged household comes from at rest", () => {
    const pleine = table({ id: "pleine", capacity: 4, households: [foyer({ id: "assis" })] });
    expect(etatDeTable(pleine, { foyer: foyer({ id: "assis" }), depuis: "pleine" })).toBe("repos");
  });
});

describe("issueDuGlisser", () => {
  it("does nothing for a drag cancelled or dropped on dead space", () => {
    expect(issueDuGlisser(null, null)).toBeNull();
  });

  it("does nothing when dropped back where it came from", () => {
    expect(issueDuGlisser({ householdId: "h", tableId: "t1" }, "t1")).toBeNull();
    expect(issueDuGlisser({ householdId: "h", tableId: null }, null)).toBeNull();
  });

  it("seats the household at the table it was dropped on", () => {
    expect(issueDuGlisser({ householdId: "h", tableId: "t2" }, "t1")).toEqual({ geste: "placer", householdId: "h", tableId: "t2" });
  });

  it("unseats a household dropped on « À placer »", () => {
    expect(issueDuGlisser({ householdId: "h", tableId: null }, "t1")).toEqual({ geste: "retirer", householdId: "h" });
  });
});

describe("capaciteValide", () => {
  // Gardée en texte : un champ vidé vaut "", et Number("") donnerait 0.
  it("refuses an empty entry rather than reading it as zero", () => {
    expect(capaciteValide("")).toBeNull();
    expect(capaciteValide("  ")).toBeNull();
  });

  it("refuses zero, a fraction and a negative", () => {
    expect(capaciteValide("0")).toBeNull();
    expect(capaciteValide("2.5")).toBeNull();
    expect(capaciteValide("-3")).toBeNull();
  });

  it("reads a whole number of at least one", () => {
    expect(capaciteValide("10")).toBe(10);
  });
});

describe("bilan", () => {
  it("adds up seats taken, capacities, and what is left to seat", () => {
    const tables = [
      table({ capacity: 8, households: [foyer({ allocatedSeats: 5, confirmedCount: 5 })] }),
      table({ id: "t2", capacity: 10, households: [foyer({ id: "p", status: "PENDING", confirmedCount: null, allocatedSeats: 2 })] }),
    ];
    const aPlacer = [foyer({ id: "x", allocatedSeats: 3, confirmedCount: null, status: "PENDING" }), foyer({ id: "y", confirmedCount: 1 })];
    expect(bilan(tables, aPlacer)).toEqual({ placesAttribuees: 7, placesTotales: 18, foyersAPlacer: 2, placesAPlacer: 4 });
  });
});
