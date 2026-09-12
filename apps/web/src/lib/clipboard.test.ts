import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./clipboard";

function stubPressePapier(writeText: ((texte: string) => Promise<void>) | null, secure = true) {
  const clipboardOriginal = navigator.clipboard;
  const secureOriginal = window.isSecureContext;
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  });
  Object.defineProperty(window, "isSecureContext", { value: secure, configurable: true });
  return () => {
    Object.defineProperty(navigator, "clipboard", { value: clipboardOriginal, configurable: true });
    Object.defineProperty(window, "isSecureContext", { value: secureOriginal, configurable: true });
  };
}

afterEach(() => vi.restoreAllMocks());

describe("copyToClipboard", () => {
  it("copies and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const restore = stubPressePapier(writeText);
    await expect(copyToClipboard("https://mariage.example/i/aZ3k9Lm2")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://mariage.example/i/aZ3k9Lm2");
    restore();
  });

  // Hors contexte sécurisé, l'API n'existe pas. Renvoyer `true` ferait croire
  // à l'organisateur qu'il tient le lien, et il collerait autre chose dans
  // WhatsApp — le pire des échecs, celui qu'on ne voit pas.
  it("reports failure outside a secure context instead of pretending", async () => {
    const restore = stubPressePapier(vi.fn().mockResolvedValue(undefined), false);
    await expect(copyToClipboard("peu importe")).resolves.toBe(false);
    restore();
  });

  it("reports failure when the API is absent", async () => {
    const restore = stubPressePapier(null);
    await expect(copyToClipboard("peu importe")).resolves.toBe(false);
    restore();
  });

  it("reports failure when the browser refuses, without throwing", async () => {
    const restore = stubPressePapier(vi.fn().mockRejectedValue(new Error("refusé")));
    await expect(copyToClipboard("peu importe")).resolves.toBe(false);
    restore();
  });
});
