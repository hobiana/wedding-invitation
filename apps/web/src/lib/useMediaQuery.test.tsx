import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

type Ecouteur = (evenement: MediaQueryListEvent) => void;

/** Un `matchMedia` pilotable : il retient ses écouteurs et sait les rappeler. */
function stubMatchMedia(matches: boolean) {
  const original = window.matchMedia;
  const ecouteurs: Ecouteur[] = [];
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, ecouteur: Ecouteur) => ecouteurs.push(ecouteur),
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return {
    change: (nouvelle: boolean) =>
      ecouteurs.forEach((e) => e({ matches: nouvelle } as MediaQueryListEvent)),
    restore: () => {
      window.matchMedia = original;
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("useMediaQuery", () => {
  it("reports what the browser says", () => {
    const media = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
    media.restore();
  });

  it("follows the query when the window changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => media.change(true));
    expect(result.current).toBe(true);
    media.restore();
  });

  // Un environnement sans matchMedia ne doit pas décider à la place de la page.
  it("answers false when matchMedia is missing", () => {
    const original = window.matchMedia;
    // @ts-expect-error — on simule un environnement qui ne le fournit pas.
    delete window.matchMedia;
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    window.matchMedia = original;
  });
});
