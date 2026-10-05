import { describe, expect, it } from "vitest";
import { filtrerFoyers, plier } from "./plier";

const foyer = (displayName: string, memberNames: string[] = []) => ({ id: displayName, displayName, memberNames });

describe("plier", () => {
  it("drops case and accents", () => {
    expect(plier("Raïssa ÉLODIE")).toBe("raissa elodie");
  });

  // La forme décomposée (e + accent combinant) arrive d'un copier-coller macOS.
  it("folds an already decomposed accent", () => {
    expect(plier("e" + String.fromCharCode(0x0301))).toBe("e");
  });
});

describe("filtrerFoyers", () => {
  const liste = [foyer("Famille Rakoto", ["Raïssa", "Hery"]), foyer("Famille Rabe"), foyer("Inès & Paul")];

  it("keeps everything for an empty or blank query", () => {
    expect(filtrerFoyers(liste, "   ")).toEqual(liste);
  });

  it("finds a household by its name without case or accents", () => {
    expect(filtrerFoyers(liste, "ines").map((f) => f.displayName)).toEqual(["Inès & Paul"]);
  });

  it("finds a household by one of its members' first names", () => {
    expect(filtrerFoyers(liste, "RAISSA").map((f) => f.displayName)).toEqual(["Famille Rakoto"]);
  });

  it("keeps the order it was given", () => {
    expect(filtrerFoyers(liste, "famille").map((f) => f.displayName)).toEqual(["Famille Rakoto", "Famille Rabe"]);
  });

  it("tolerates a household without member names", () => {
    expect(filtrerFoyers([{ id: "x", displayName: "Rabe" }], "rabe")).toHaveLength(1);
  });
});
