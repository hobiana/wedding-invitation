import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvelopeGate } from "./EnvelopeGate";

/**
 * jsdom implémente `matchMedia` et répond « non » à tout. C'est le cas par
 * défaut qu'on veut pour la plupart des tests ; celui qui teste le mouvement
 * réduit installe sa propre réponse.
 */
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

const envelope = () => screen.queryByRole("button", { name: /ouvrir l'invitation/i });

afterEach(() => {
  vi.useRealTimers();
});

describe("EnvelopeGate", () => {
  it("shows the design's scene: the call, the seal, the envelope", () => {
    render(<EnvelopeGate onReveal={() => {}} />);

    expect(screen.getByText("Vous êtes")).toBeInTheDocument();
    expect(screen.getByText("Invités")).toBeInTheDocument();
    expect(envelope()).toBeInTheDocument();
  });

  /**
   * Le défaut du design, et la raison d'être de ce fichier.
   *
   * Il pose un `onClick` sur une `div` plein écran : à la souris ça marche, au
   * clavier l'invitation est murée — rien n'est focusable, donc rien ne s'ouvre,
   * et la page est derrière un voile qu'on ne peut pas lever. L'enveloppe est
   * donc un vrai `<button>`, et il prend le focus dès le montage : un invité au
   * clavier n'a rien à chercher, il appuie.
   */
  it("puts the envelope itself in the keyboard's hands", () => {
    render(<EnvelopeGate onReveal={() => {}} />);

    const bouton = envelope();
    expect(bouton?.tagName).toBe("BUTTON");
    expect(bouton).toHaveFocus();
  });

  /**
   * L'image ne dit rien que le bouton ne dise déjà. Deux libellés pour un seul
   * objet, c'est une lecture à voix haute qui bégaie.
   */
  it("names the control once, not twice", () => {
    render(<EnvelopeGate onReveal={() => {}} />);

    const image = envelope()?.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("aria-hidden", "true");
  });

  it("opens on a click anywhere on the field, as the design does", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    render(<EnvelopeGate onReveal={onReveal} />);

    fireEvent.click(screen.getByTestId("porte"));

    act(() => vi.advanceTimersByTime(1400));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  /**
   * Le filet de sécurité, et c'est la ligne la plus importante de la
   * fonctionnalité.
   *
   * Le retrait du voile est un `setTimeout` posé au clic — **jamais** un
   * `animationend`. Si une animation ne démarre pas, si une image de rendu se
   * bloque, si le navigateur décide de ne pas jouer la scène, la porte s'en va
   * quand même. Sans ça, un défaut de peinture transforme l'invitation en mur
   * bordeaux et le mariage perd des réponses.
   *
   * Ce test ne déclenche donc aucun événement d'animation, exprès.
   */
  it("takes itself away on a timer, never on an animation event", () => {
    vi.useFakeTimers();
    render(<EnvelopeGate onReveal={() => {}} />);

    fireEvent.click(screen.getByTestId("porte"));
    expect(screen.getByTestId("porte")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1750));
    expect(screen.queryByTestId("porte")).not.toBeInTheDocument();
  });

  /** Le design garde `if (this.state.opened) return`. Deux clics, une scène. */
  it("ignores every click after the first", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    render(<EnvelopeGate onReveal={onReveal} />);

    const porte = screen.getByTestId("porte");
    fireEvent.click(porte);
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(porte);
    fireEvent.click(porte);

    act(() => vi.advanceTimersByTime(1400));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  /**
   * `prefers-reduced-motion` : la porte n'est **pas montée du tout**, décidé
   * avant le premier rendu plutôt que neutralisé après coup. L'invité arrive
   * directement sur l'invitation, entière.
   *
   * Ce n'est pas une version dégradée : c'est la même page sans le préambule. Et
   * c'est pour ça que la page ne doit jamais attendre `onReveal` pour être
   * lisible — ici, il ne sera jamais appelé.
   */
  it("never mounts at all when the guest asked for less movement", () => {
    const restore = stubReducedMotion(true);
    try {
      const onReveal = vi.fn();
      const { container } = render(<EnvelopeGate onReveal={onReveal} />);

      expect(container).toBeEmptyDOMElement();
      expect(onReveal).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});
