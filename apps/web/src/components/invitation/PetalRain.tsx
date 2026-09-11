import { useState, type CSSProperties } from "react";

/**
 * Les pétales — sur toute la page, tout le temps.
 *
 * Ils vivaient dans la porte et s'en allaient avec elle. Le commanditaire les
 * veut sur l'invitation elle-même : ils tombent donc **au-dessus de tout**, la
 * porte comprise, du premier rendu jusqu'à la fin de la visite. Un seul calque
 * pour les deux moments, et le passage de l'un à l'autre n'a plus rien à
 * raccorder — il n'y a rien qui commence ni qui s'arrête.
 *
 * `z-[60]` est délibérément au-dessus du `z-50` de la porte : pendant la scène
 * les pétales tombent **sur** le champ crème, comme dans le design, et quand le
 * voile s'en va ils continuent sur le faire-part sans qu'un seul se perde.
 *
 * `pointer-events: none` n'est pas un détail de confort : ce calque couvre la
 * fenêtre entière, formulaire de réponse compris. Sans cette ligne, il avale
 * chaque clic de la page et l'invité ne peut plus répondre.
 */

/**
 * Le design en sème 14. Sur un téléphone c'est une pluie ; sur un écran de
 * 1600 px, c'est trois points perdus dans du vide. Le nombre suit donc la
 * largeur — un pétale tous les ~60 px — et il est borné des deux côtés : assez
 * pour qu'on les voie sur un petit écran, pas assez pour qu'un téléphone
 * d'entrée de gamme compose quarante calques en permanence.
 */
const MIN = 16;
const MAX = 34;

/**
 * Les trois teintes.
 *
 * Le design tire ici son `#C9A24A`. C'est l'or que le commanditaire a écarté à
 * l'arbitrage du 2026-08-22 au profit du `#AC784C` relevé sur son faire-part
 * papier — et deux ors différents sur le même écran se voient. On garde le sien.
 */
const COULEURS = [
  "var(--color-gold)",
  "var(--color-bordeaux-500)",
  "#b9536a",
];

interface Petal {
  left: number;
  fall: number;
  delay: number;
  sway: number;
  swayDuration: number;
  width: number;
  height: number;
  color: string;
}

const between = (a: number, b: number) => a + Math.random() * (b - a);

function count(): number {
  const largeur = typeof window === "undefined" ? 420 : window.innerWidth;
  return Math.max(MIN, Math.min(MAX, Math.round(largeur / 60)));
}

function makePetals(): Petal[] {
  return Array.from({ length: count() }, (_, i) => ({
    left: between(2, 96),
    fall: between(18, 25),
    // Retard négatif : la chute est déjà commencée à l'ouverture de la page.
    // Sans lui, ils partiraient tous du haut ensemble, et on verrait une
    // salve au lieu d'une pluie.
    delay: -between(0, 22),
    sway: Math.round(between(5, 20)),
    swayDuration: between(4, 8),
    width: Math.round(between(7, 14)),
    height: Math.round(between(6, 11)),
    color: COULEURS[i % 3],
  }));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function PetalRain() {
  // Décidé avant le premier rendu. Ce calque tourne **en permanence** : c'est
  // la seule animation de la page qui ne s'arrête jamais, donc c'est celle
  // qu'un invité ayant demandé moins de mouvement doit le moins subir.
  const [petals] = useState(() => (prefersReducedMotion() ? [] : makePetals()));

  if (petals.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="petales"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {petals.map((petal, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: `${petal.left}%`,
            animation: `petal-fall ${petal.fall.toFixed(1)}s ease-in-out infinite`,
            animationDelay: `${petal.delay.toFixed(1)}s`,
          }}
        >
          <div
            style={
              {
                "--sway": `${petal.sway}px`,
                animation: `petal-sway ${petal.swayDuration.toFixed(1)}s ease-in-out infinite`,
              } as CSSProperties
            }
          >
            <div
              style={{
                width: petal.width,
                height: petal.height,
                borderRadius: "60% 40% 55% 45%",
                background: petal.color,
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
