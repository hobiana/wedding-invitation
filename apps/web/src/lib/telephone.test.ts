import { describe, expect, it } from "vitest";
import { MAX_TELEPHONES, lienTel, erreursTelephones } from "./telephone";

describe("lienTel", () => {
  it("compose le numéro sans espaces, le + conservé", () => {
    expect(lienTel("+261 34 64 314 02")).toBe("tel:+261346431402");
  });

  it("retire aussi tirets, points et parenthèses", () => {
    expect(lienTel("(+261) 34-64.314 02")).toBe("tel:+261346431402");
  });

  it("ignore les blancs en bord de saisie", () => {
    expect(lienTel("  034 64 314 02 ")).toBe("tel:0346431402");
  });
});

describe("erreursTelephones", () => {
  it("n'a rien à redire à des numéros valides et distincts", () => {
    expect(erreursTelephones(["+261 34 64 314 02", "034.29.682.30"])).toEqual([null, null]);
  });

  it("refuse un numéro vide ou blanc", () => {
    expect(erreursTelephones(["   "])[0]).toMatch(/indiquez un numéro/i);
  });

  it("refuse un numéro de moins de 7 chiffres", () => {
    expect(erreursTelephones(["+261 34"])[0]).toMatch(/au moins 7 chiffres/i);
  });

  it("accepte exactement 7 chiffres", () => {
    expect(erreursTelephones(["123 45 67"])).toEqual([null]);
  });

  it("refuse les lettres et les autres signes", () => {
    expect(erreursTelephones(["034 64 314 0x"])[0]).toMatch(/chiffres, espaces/i);
    expect(erreursTelephones(["034/64/314/02"])[0]).toMatch(/chiffres, espaces/i);
  });

  /** Même règle que l'API (`PHONE`) : sinon la page laisse partir un 400. */
  it("n'accepte le + qu'en tête du numéro, comme l'API", () => {
    expect(erreursTelephones(["(+261) 33 12 345 67"])[0]).toMatch(/\+.*en tête/i);
    expect(erreursTelephones(["034 + 64 314 02"])[0]).toMatch(/\+.*en tête/i);
    expect(erreursTelephones(["+261 (33) 12-345.67"])).toEqual([null]);
  });

  it("refuse plus de 30 caractères, la limite de l'API", () => {
    expect(erreursTelephones(["0".repeat(31)])[0]).toMatch(/30 caractères/i);
    expect(erreursTelephones(["0".repeat(30)])).toEqual([null]);
  });

  /** Deux saisies qui composent le même numéro sont un doublon, même écrites autrement. */
  it("signale le doublon sur la seconde occurrence seulement", () => {
    expect(erreursTelephones(["+261 34 64 314 02", "+261346431402"])).toEqual([
      null,
      expect.stringMatching(/déjà dans la liste/i),
    ]);
  });

  it("plafonne la liste à cinq numéros", () => {
    expect(MAX_TELEPHONES).toBe(5);
  });
});
