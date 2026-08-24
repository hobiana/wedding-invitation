import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CouplePhoto } from "./CouplePhoto";

describe("CouplePhoto", () => {
  // La photo est à deux écrans du haut de page. La charger avant le texte
  // qu'elle suit coûterait 25 Ko à un invité en 4G faible pour rien.
  it("waits until it is nearly on screen before spending the guest's bandwidth", () => {
    render(<CouplePhoto />);

    const img = screen.getByRole("img", { name: /hobiana et lovasoa/i });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  // Le portrait livré est un 3:4 (1080 × 1440) et le paysage un 3:2. Déclarer
  // les dimensions natives réserve la place exacte : sans elles, la page saute
  // sous le doigt de l'invité au moment où la photo arrive.
  it("declares the delivered file's own dimensions rather than a wished-for ratio", () => {
    render(<CouplePhoto />);

    const img = screen.getByRole("img", { name: /hobiana et lovasoa/i });
    expect(img).toHaveAttribute("width", "1080");
    expect(img).toHaveAttribute("height", "1440");
  });

  // Elle porte l'émotion de la page : la décrire par `alt=""` la retirerait
  // purement et simplement à qui l'écoute.
  it("describes itself to a guest who cannot see it", () => {
    render(<CouplePhoto />);

    const img = screen.getByRole("img", { name: /hobiana et lovasoa/i });
    expect(img.getAttribute("alt")?.length ?? 0).toBeGreaterThan(20);
  });
});
