import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  // tailwind-merge ne connaît que les rayons de Tailwind (`sm`, `lg`…). Sans
  // les jetons du projet, `cn("rounded-control", "rounded-field")` garde les
  // deux classes et c'est l'ordre du CSS produit — pas l'appelant — qui
  // décide lequel s'applique.
  it("lets a project radius token override another", () => {
    expect(cn("rounded-control", "rounded-field")).toBe("rounded-field");
    expect(cn("rounded-surface", "rounded-card")).toBe("rounded-card");
    expect(cn("rounded-button", "rounded-full")).toBe("rounded-full");
  });

  it("still merges the ordinary utilities", () => {
    expect(cn("h-8 px-3", "h-10")).toBe("px-3 h-10");
  });
});
