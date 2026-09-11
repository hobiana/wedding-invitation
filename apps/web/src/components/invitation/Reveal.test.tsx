import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./Reveal";

/**
 * jsdom n'implémente pas `IntersectionObserver`. C'est une chance : le cas par
 * défaut de ces tests est donc **exactement** le navigateur qui ne sait pas
 * observer, c'est-à-dire le cas qu'il ne faut surtout pas rater.
 */

/** Un observateur de pacotille, dont les tests décident quand il tire. */
function installObserver() {
  const observed: Element[] = [];
  const callbacks: IntersectionObserverCallback[] = [];
  let disconnects = 0;

  const options: (IntersectionObserverInit | undefined)[] = [];

  class Fake {
    constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
      callbacks.push(cb);
      options.push(init);
    }
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {
      disconnects += 1;
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  }

  const original = (globalThis as Record<string, unknown>).IntersectionObserver;
  (globalThis as Record<string, unknown>).IntersectionObserver = Fake;

  return {
    observed,
    options,
    get disconnects() {
      return disconnects;
    },
    entre() {
      act(() => {
        for (const cb of callbacks) {
          cb(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
    restore() {
      (globalThis as Record<string, unknown>).IntersectionObserver = original;
    },
  };
}

function stubReducedMotion(reduce: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

/** La `div` posée par `Reveal` : c'est la racine de ce que le test rend. */
const bloc = (container: HTMLElement) => container.firstElementChild;

afterEach(() => vi.restoreAllMocks());

describe("Reveal", () => {
  /**
   * **Le test qui compte plus que tous les autres de ce fichier.**
   *
   * Sans `IntersectionObserver`, rien n'est masqué — pas d'attribut, pas de
   * règle, pas d'opacité en attente. Une section cachée que personne ne
   * démasque, c'est une invitation blanche chez un invité, et il ne le dira
   * jamais : il ne répondra pas, voilà tout. Le défaut par défaut est donc
   * « on voit tout », et c'est ici qu'on le verrouille.
   */
  it("hides nothing at all when the browser cannot observe", () => {
    expect(globalThis.IntersectionObserver).toBeUndefined();

    const { container } = render(<Reveal>Le lieu de la réception</Reveal>);

    expect(screen.getByText("Le lieu de la réception")).toBeInTheDocument();
    expect(bloc(container)).not.toHaveAttribute("data-reveal-block");
  });

  /** Même règle pour qui a demandé moins de mouvement : la page est entière. */
  it("hides nothing when the guest asked for less movement", () => {
    const observer = installObserver();
    const restore = stubReducedMotion(true);
    try {
      const { container } = render(<Reveal>Le lieu de la réception</Reveal>);

      expect(bloc(container)).not.toHaveAttribute("data-reveal-block");
      expect(observer.observed).toHaveLength(0);
    } finally {
      restore();
      observer.restore();
    }
  });

  it("waits out of sight, then rises when the guest arrives", () => {
    const observer = installObserver();
    try {
      const { container } = render(<Reveal>Le lieu de la réception</Reveal>);

      expect(bloc(container)).toHaveAttribute("data-reveal-block", "hidden");
      expect(observer.observed).toHaveLength(1);

      observer.entre();
      expect(bloc(container)).toHaveAttribute("data-reveal-block", "shown");
    } finally {
      observer.restore();
    }
  });

  /**
   * Le seuil est zéro, et ce n'est pas un réglage par défaut qu'on aurait
   * laissé traîner : c'est une correction.
   *
   * Mesuré dans le navigateur — **le bloc du plan de table fait 0 px de haut**
   * tant que l'organisateur ne l'a pas activé. Une cible sans surface a un
   * ratio d'intersection nul par construction : elle ne franchit aucun seuil
   * positif, et serait restée masquée pour toujours. Une section plus haute
   * que l'écran pose le même problème en plus discret.
   *
   * Ce test ne vérifie pas un effet, il verrouille une décision : le jour où
   * quelqu'un remet un seuil « raisonnable », il casse ici et lit pourquoi.
   */
  it("watches at a threshold of zero, so a section of no height can still rise", () => {
    const observer = installObserver();
    try {
      render(<Reveal>Le lieu de la réception</Reveal>);

      expect(observer.options[0]?.threshold).toBe(0);
      expect(observer.options[0]?.rootMargin).toMatch(/px$/);
    } finally {
      observer.restore();
    }
  });

  /**
   * On cesse de regarder une fois la section levée. Remonter la page ne refait
   * pas jouer le fondu — une invitation qui clignote à chaque passage se lit
   * comme un défaut, pas comme une intention.
   */
  it("stops watching once the section has risen", () => {
    const observer = installObserver();
    try {
      const { container } = render(<Reveal>Le lieu de la réception</Reveal>);
      observer.entre();

      expect(observer.disconnects).toBeGreaterThan(0);
      expect(bloc(container)).toHaveAttribute("data-reveal-block", "shown");
    } finally {
      observer.restore();
    }
  });

  /**
   * Le contenu masqué reste lu par un lecteur d'écran : `opacity: 0` le laisse
   * dans l'arbre d'accessibilité, là où `visibility: hidden` ou `display: none`
   * l'en sortiraient. Un invité aveugle lit donc toute l'invitation d'emblée,
   * sans avoir à la faire défiler pour la « révéler ».
   */
  it("keeps hidden content readable by a screen reader", () => {
    const observer = installObserver();
    try {
      const { container } = render(
        <Reveal>
          <p>Le lieu de la réception</p>
        </Reveal>,
      );

      expect(bloc(container)).toHaveAttribute("data-reveal-block", "hidden");
      // `getByText` passe par l'arbre rendu ; ce qui compte est qu'aucun
      // `hidden`, `aria-hidden` ni `display: none` ne soit posé au passage.
      const texte = screen.getByText("Le lieu de la réception");
      expect(texte).toBeVisible();
      expect(texte.closest("[aria-hidden]")).toBeNull();
    } finally {
      observer.restore();
    }
  });
});
