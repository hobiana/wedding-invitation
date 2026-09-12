import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareLinkButton } from "./ShareLinkButton";

function stubPartage(share: ((donnees: ShareData) => Promise<void>) | null) {
  const original = navigator.share;
  Object.defineProperty(navigator, "share", { value: share ?? undefined, configurable: true });
  return () => {
    Object.defineProperty(navigator, "share", { value: original, configurable: true });
  };
}

afterEach(() => vi.restoreAllMocks());

describe("ShareLinkButton", () => {
  it("hands the browser the guest URL to share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const restore = stubPartage(share);
    const utilisateur = userEvent.setup();
    render(<ShareLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Partager le lien de Rakotomavo/ }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${window.location.origin}/i/aZ3k9Lm2` }),
    );
    restore();
  });

  // Sur un poste de bureau, `navigator.share` n'existe pas : un bouton qui ne
  // fera rien est pire que pas de bouton.
  it("renders nothing when the browser cannot share", () => {
    const restore = stubPartage(null);
    const { container } = render(<ShareLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);
    expect(container).toBeEmptyDOMElement();
    restore();
  });

  // Fermer la feuille de partage rejette la promesse. Ce n'est pas une erreur.
  it("stays quiet when the organiser dismisses the share sheet", async () => {
    const restore = stubPartage(vi.fn().mockRejectedValue(new DOMException("Abort", "AbortError")));
    const utilisateur = userEvent.setup();
    render(<ShareLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Partager le lien de Rakotomavo/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    restore();
  });
});
