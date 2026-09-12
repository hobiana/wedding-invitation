import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { StatusBadge } from "@/components/StatusBadge";

describe("Badge", () => {
  it("tints from the status tokens, never from a raw palette colour", () => {
    render(<Badge tone="yes">Confirmé</Badge>);
    const pastille = screen.getByText("Confirmé");
    expect(pastille.className).toContain("text-status-yes");
    expect(pastille.className).toContain("bg-status-yes-bg");
  });

  // La règle du design system : jamais l'information par la seule couleur.
  it.each([
    ["CONFIRMED", "Confirmé"],
    ["DECLINED", "Décliné"],
    ["PENDING", "En attente"],
  ] as const)("spells %s out as %s, so colour is never the only carrier", (status, libelle) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(libelle)).toBeInTheDocument();
  });

  // Le rouge et le vert de Tailwind jurent à côté du bordeaux : la direction
  // artistique les exclut, et rien ne le rappellerait sans ce test.
  it.each(["CONFIRMED", "DECLINED", "PENDING"] as const)(
    "keeps %s off the raw palette",
    (status) => {
      const { container } = render(<StatusBadge status={status} />);
      expect(container.innerHTML).not.toMatch(/(red|green|amber|yellow)-\d{2,3}/);
    },
  );
});
