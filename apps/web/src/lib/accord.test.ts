import { describe, expect, it } from "vitest";
import { foyers, places, placesLibres, placesRestantes } from "./accord";

describe("accord", () => {
  // En français, zéro et un sont au singulier : « 0 place », « 1 place ».
  it("keeps zero and one in the singular", () => {
    expect(places(0)).toBe("0 place");
    expect(places(1)).toBe("1 place");
    expect(foyers(1)).toBe("1 foyer");
  });

  it("agrees the remaining seats, adjective included", () => {
    expect(placesRestantes(1)).toBe("1 place restante");
    expect(placesRestantes(6)).toBe("6 places restantes");
  });

  it("agrees the free seats of a table", () => {
    expect(placesLibres(1)).toBe("1 place libre");
    expect(placesLibres(3)).toBe("3 places libres");
  });

  it("puts two and more in the plural", () => {
    expect(places(2)).toBe("2 places");
    expect(foyers(12)).toBe("12 foyers");
  });
});
