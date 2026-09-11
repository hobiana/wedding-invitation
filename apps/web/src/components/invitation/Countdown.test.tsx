import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Countdown } from "./Countdown";

const CEREMONY = "2027-01-02T06:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** 2 jours, 3 heures, 4 minutes et 5 secondes avant la cérémonie. */
function poseLHeure(avant = { j: 2, h: 3, m: 4, s: 5 }) {
  const cible = new Date(CEREMONY).getTime();
  const ms = ((avant.j * 24 + avant.h) * 60 + avant.m) * 60000 + avant.s * 1000;
  vi.setSystemTime(new Date(cible - ms));
}

describe("Countdown", () => {
  it("breaks the remaining time into days, hours, minutes and seconds", () => {
    poseLHeure();
    render(<Countdown weddingDate={CEREMONY} />);

    const cadran = screen.getByTestId("cadran");
    expect(within(cadran).getByText("2")).toBeInTheDocument();
    expect(within(cadran).getByText("03")).toBeInTheDocument();
    expect(within(cadran).getByText("04")).toBeInTheDocument();
    expect(within(cadran).getByText("05")).toBeInTheDocument();
  });

  it("ticks", () => {
    poseLHeure();
    render(<Countdown weddingDate={CEREMONY} />);

    vi.advanceTimersByTime(2000);
    expect(within(screen.getByTestId("cadran")).getByText("03")).toBeInTheDocument();
  });

  /**
   * Un compteur qui change toutes les secondes est une agression pour un
   * lecteur d'écran : il réannonce sans fin et couvre le reste de la page.
   * Les chiffres se taisent donc, et une phrase les remplace — lue une fois,
   * et qui dit la seule chose dont on ait besoin.
   */
  it("silences the ticking figures and leaves a sentence instead", () => {
    poseLHeure();
    render(<Countdown weddingDate={CEREMONY} />);

    expect(screen.getByTestId("cadran")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(/il reste 2 jours/i)).toBeInTheDocument();
  });

  it("says the singular for the last day", () => {
    poseLHeure({ j: 1, h: 0, m: 0, s: 0 });
    render(<Countdown weddingDate={CEREMONY} />);

    expect(screen.getByText(/il reste 1 jour avant/i)).toBeInTheDocument();
  });

  // Le lendemain du mariage, la page existe encore : des invités la rouvrent
  // pour retrouver une adresse ou une photo. Un compteur négatif serait un bug
  // visible le seul jour où personne ne peut le corriger.
  it("rests at zero once the day has passed", () => {
    vi.setSystemTime(new Date("2027-01-03T00:00:00.000Z"));
    render(<Countdown weddingDate={CEREMONY} />);

    const cadran = screen.getByTestId("cadran");
    expect(within(cadran).getAllByText(/^0+$/).length).toBe(4);
    expect(screen.getByText(/c'est aujourd'hui|le grand jour est passé/i)).toBeInTheDocument();
  });

  it("stops its timer when it leaves the page", () => {
    poseLHeure();
    const { unmount } = render(<Countdown weddingDate={CEREMONY} />);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
