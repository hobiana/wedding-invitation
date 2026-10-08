import { afterEach, describe, expect, it, vi } from "vitest";
import { initiale, membresRetenus, motPlaces, places, prenoms, retenirMembres, sousTitreFoyers } from "./foyers";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("places", () => {
  // L'invariant qui a cassé trois fois : sans réponse, `null` se lit « — »,
  // jamais « 0 » qui dirait « personne ne vient ».
  it("writes a dash for a household that has not answered", () => {
    expect(places({ confirmedCount: null, allocatedSeats: 4 })).toBe("— / 4");
  });

  it("writes 0 for a household that declined", () => {
    expect(places({ confirmedCount: 0, allocatedSeats: 2 })).toBe("0 / 2");
  });

  it("writes the confirmed count otherwise", () => {
    expect(places({ confirmedCount: 3, allocatedSeats: 3 })).toBe("3 / 3");
  });
});

describe("motPlaces", () => {
  // « 1 / 1 places » est une faute : le nom s'accorde sur le dernier nombre,
  // la capacité du foyer, et zéro reste au singulier en français.
  it.each([
    [0, "place"],
    [1, "place"],
    [2, "places"],
    [4, "places"],
  ])("agrees with %i seat(s)", (n, mot) => {
    expect(motPlaces(n)).toBe(mot);
  });
});

describe("prenoms", () => {
  it("keeps the first word of each member", () => {
    expect(prenoms(["Lova Andriambelo", "Haja Andriambelo", "Toky"])).toEqual(["Lova", "Haja", "Toky"]);
  });

  it("skips blank names and trims the others", () => {
    expect(prenoms(["  Fara  Rakoto ", "", "   "])).toEqual(["Fara"]);
  });

  it("returns nothing for a household without members", () => {
    expect(prenoms([])).toEqual([]);
  });
});

describe("initiale", () => {
  it("is the first letter, in capitals", () => {
    expect(initiale("tiana Andriamanana")).toBe("T");
  });

  it("keeps an accented letter whole", () => {
    expect(initiale(" éric")).toBe("É");
  });

  it("is empty for an empty name", () => {
    expect(initiale("  ")).toBe("");
  });
});

describe("sousTitreFoyers", () => {
  it("counts every household when nothing filters", () => {
    expect(sousTitreFoyers(40, false)).toBe("40 foyers");
  });

  it("agrees with one household", () => {
    expect(sousTitreFoyers(1, false)).toBe("1 foyer");
  });

  it("says found when a filter is active", () => {
    expect(sousTitreFoyers(4, true)).toBe("4 foyers trouvés");
    expect(sousTitreFoyers(1, true)).toBe("1 foyer trouvé");
  });

  it("says none rather than 0", () => {
    expect(sousTitreFoyers(0, false)).toBe("Aucun foyer");
    expect(sousTitreFoyers(0, true)).toBe("Aucun foyer trouvé");
  });
});

describe("membres mémorisés", () => {
  it("are shown by default", () => {
    expect(membresRetenus()).toBe(true);
  });

  it("remember the last choice", () => {
    retenirMembres(false);
    expect(window.localStorage.getItem("foyers.membres")).toBe("0");
    expect(membresRetenus()).toBe(false);
    retenirMembres(true);
    expect(membresRetenus()).toBe(true);
  });

  it("fall back to shown when the stored value is garbage", () => {
    window.localStorage.setItem("foyers.membres", "peut-être");
    expect(membresRetenus()).toBe(true);
  });

  // Navigation privée stricte : le stockage lève, l'écran ne doit pas tomber.
  it("survive a storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(membresRetenus()).toBe(true);
    expect(() => retenirMembres(false)).not.toThrow();
  });
});
