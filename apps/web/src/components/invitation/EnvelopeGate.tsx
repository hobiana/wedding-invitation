import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * La porte — l'enveloppe fermée qu'on ouvre pour entrer dans l'invitation.
 *
 * Transcrite du design du commanditaire (`images/html/`, composant Vue) :
 * mêmes durées, mêmes courbes, mêmes retards, mêmes dégradés. Les valeurs qui
 * paraissent arbitraires — `min(34vh, 270px)`, `112deg`, `-31%` — le sont
 * parce qu'elles viennent de là et non d'un réglage à l'œil.
 *
 * Ce qui a été **ajouté** au design, et pourquoi :
 *
 * - **Le clavier.** Le design pose un `onClick` sur une `div` plein écran :
 *   à la souris ça marche, au clavier la page est murée. L'enveloppe est donc
 *   un vrai `<button>`, qui prend le focus au montage. Le clic n'importe où
 *   reste offert par-dessus, pour la souris et le doigt.
 * - **`prefers-reduced-motion`.** La porte n'est alors **pas montée du tout**,
 *   décidé avant le premier rendu plutôt que neutralisé après coup. L'invité
 *   arrive directement sur l'invitation. Ce n'est pas une version dégradée,
 *   c'est la même page sans le préambule.
 * - **Le filet de sécurité.** Le retrait du voile est un `setTimeout` posé au
 *   clic, jamais un `animationend`. Si une image de rendu se bloque, si une
 *   animation ne démarre pas, la porte s'en va quand même. Sans ça, un défaut
 *   de peinture transforme l'invitation en mur bordeaux et le mariage perd des
 *   réponses.
 *
 * Ce qui n'a **pas** été ajouté : aucune mémoire. La porte se joue à chaque
 * chargement de page, comme dans le design. Un `sessionStorage` la sauterait
 * au deuxième passage ; c'est une ligne à écrire si le commanditaire le veut.
 */

/** Le design : `setTimeout(() => setState({gate:false, revealed:true}), 1400)`. */
const REVEAL_AT = 1400;

/**
 * 1050 ms de retard + 700 ms de fondu = 1750. Le design retirait le voile à
 * 1400, c'est-à-dire **au milieu de son propre fondu** : le champ crème, encore
 * à demi opaque, disparaissait d'un coup. C'est le seul écart de minutage que
 * je me suis permis, et il ne change rien à ce qu'on voit — il enlève un
 * ressaut.
 */
const UNMOUNT_AT = 1750;

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

interface Particle {
  size: number;
  round: boolean;
  color: string;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
}

/**
 * Les trois teintes des pétales et de l'éclat.
 *
 * Le design tire ici son `#C9A24A`. C'est l'or que le commanditaire a écarté à
 * l'arbitrage du 2026-08-22 au profit du `#AC784C` relevé sur son faire-part
 * papier — et deux ors différents à quarante pixels l'un de l'autre, sur le
 * seul écran où l'invité regarde vraiment, se voient. On garde donc le sien.
 */
const PETAL_COLORS = [
  "var(--color-gold)",
  "var(--color-bordeaux-500)",
  "#b9536a",
];
const BURST_COLORS = [
  "var(--color-gold)",
  "var(--color-bordeaux-500)",
  "var(--color-gold-light)",
];

const between = (a: number, b: number) => a + Math.random() * (b - a);

/** 14 pétales, semés une seule fois par montage — le design les met en cache. */
function makePetals(): Petal[] {
  return Array.from({ length: 14 }, (_, i) => ({
    left: between(2, 96),
    fall: between(18, 25),
    // Retard négatif : la chute est déjà commencée à l'ouverture de la page.
    // Sans lui, les quatorze pétales partiraient du haut en même temps.
    delay: -between(0, 22),
    sway: Math.round(between(5, 20)),
    swayDuration: between(4, 8),
    width: Math.round(between(6, 12)),
    height: Math.round(between(5, 9)),
    color: PETAL_COLORS[i % 3],
  }));
}

/** Les 32 éclats du cachet qui se brise. */
function makeBurst(): Particle[] {
  return Array.from({ length: 32 }, (_, i) => {
    const angle = (i / 32) * Math.PI * 2 + between(-0.1, 0.1);
    const distance = between(90, 210);
    return {
      size: Math.round(between(4, 9)),
      round: i % 2 === 1,
      color: BURST_COLORS[i % 3],
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rot: Math.round(between(120, 420)),
      delay: 0.5 + i * 0.012,
    };
  });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function EnvelopeGate({ onReveal }: { onReveal: () => void }) {
  // Décidé avant le premier rendu : la porte n'existe jamais pour qui a demandé
  // moins de mouvement, plutôt que d'exister et de ne pas s'animer.
  const [mounted, setMounted] = useState(() => !prefersReducedMotion());
  const [opened, setOpened] = useState(false);
  const [petals] = useState(makePetals);
  const [burst, setBurst] = useState<Particle[] | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // `onReveal` passe par une référence, et non par les dépendances de l'effet.
  // Un appelant qui redéfinit la fonction à chaque rendu — le cas par défaut en
  // React — relancerait sinon les deux minuteurs à chaque rendu du parent, et
  // la porte ne partirait jamais. Le piège est silencieux : tout marche jusqu'à
  // ce qu'un rendu tombe au mauvais moment.
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;

  // Le focus se pose sur l'enveloppe : c'est la seule chose à faire ici, et un
  // clavier doit pouvoir la trouver sans traverser la page qui est dessous.
  useEffect(() => {
    if (mounted) buttonRef.current?.focus();
  }, [mounted]);

  /**
   * Le défilement est verrouillé tant que la porte est là.
   *
   * La direction artistique disait le contraire — « le défilement n'est jamais
   * verrouillé » — mais elle décrivait une scène qui se jouait toute seule et
   * qu'un geste devait pouvoir interrompre. Ici c'est une porte qu'on ouvre au
   * clic : défiler derrière ne mène nulle part, ça fait glisser une page qu'on
   * ne voit pas et ça laisse l'invité au milieu de nulle part quand le voile
   * s'en va.
   *
   * Deux pièges, et les deux sont traités :
   *
   * - **iOS Safari ignore `overflow: hidden` au doigt.** D'où le `touchmove`
   *   annulé, en écouteur natif **non passif** : React pose ses écouteurs en
   *   passif à la racine, et un `preventDefault()` y serait sans effet.
   * - **Tout est rendu dans le nettoyage de l'effet**, jamais à la main au
   *   moment du clic. Un démontage imprévu — une erreur, un changement de
   *   route — laisserait sinon la page verrouillée pour de bon, sans rien pour
   *   la rouvrir.
   */
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const body = document.body;
    const avant = {
      html: html.style.overflow,
      body: body.style.overflow,
      rebond: html.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "contain";

    const bloque = (event: TouchEvent) => event.preventDefault();
    window.addEventListener("touchmove", bloque, { passive: false });

    return () => {
      html.style.overflow = avant.html;
      body.style.overflow = avant.body;
      html.style.overscrollBehavior = avant.rebond;
      window.removeEventListener("touchmove", bloque);
    };
  }, [mounted]);

  function open() {
    if (opened) return;
    setOpened(true);
    setBurst(makeBurst());
  }

  useEffect(() => {
    if (!opened) return;
    const reveal = window.setTimeout(() => revealRef.current(), REVEAL_AT);
    const unmount = window.setTimeout(() => setMounted(false), UNMOUNT_AT);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(unmount);
    };
  }, [opened]);

  if (!mounted) return null;

  return (
    // Le voile. `onClick` ici est la commodité de la souris ; l'accès réel
    // passe par le bouton de l'enveloppe, plus bas.
    <div
      onClick={open}
      data-testid="porte"
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center overflow-hidden"
      style={{
        transition: "opacity 700ms ease 1050ms",
        opacity: opened ? 0 : 1,
      }}
    >
      {/* Le champ : trois taches de lumière chaude sur un papier beige. C'est
          la composition de sa référence — l'enveloppe posée sur une table, pas
          suspendue dans le noir. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 50% at 20% 18%, #fffcf6, transparent 62%)," +
            "radial-gradient(60% 45% at 84% 40%, #f6ede0, transparent 66%)," +
            "radial-gradient(80% 60% at 40% 92%, #efe3d2, transparent 70%)," +
            "linear-gradient(160deg, #f7f0e5, #e9dcc9)",
        }}
      />
      {/* Le grain du papier : des bandes à 112°, à 3 % de noir. Invisibles une
          par une, c'est leur somme qui empêche le fond de paraître numérique. */}
      <div aria-hidden="true" className="absolute inset-0" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
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
                  opacity: 0.75,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-[3] flex h-full flex-col items-center justify-center px-6 py-[18px] text-center">
        <p
          className="font-script leading-none text-bordeaux-700"
          style={{ fontSize: "clamp(34px, 7vh, 52px)" }}
        >
          Vous êtes
        </p>
        <p
          className="mt-1.5 font-display uppercase tracking-[0.22em] text-bordeaux-700"
          style={{ fontSize: "clamp(22px, 4.4vh, 34px)" }}
        >
          Invités
        </p>

        {/* Le cachet de cire, réduit à sa forme : un disque sombre, un cœur
            doré, un anneau qui s'en échappe. Il bat tant que l'enveloppe est
            fermée ; au clic il se brise et part en éclats. C'est lui qui rend
            l'ouverture causale — le cachet ferme, donc il doit céder. */}
        <div
          aria-hidden="true"
          className="relative z-[9] h-[62px] w-[62px] flex-none"
          style={{
            margin: "min(3vh, 22px) 0 min(1vh, 6px)",
            animation: opened ? "var(--animate-seal-break)" : undefined,
          }}
        >
          <div
            className="absolute inset-0 rounded-full border-[1.5px] border-bordeaux-500"
            style={
              opened
                ? {
                    animation: "var(--animate-seal-ring-burst)",
                    background:
                      "color-mix(in srgb, var(--color-gold) 20%, transparent)",
                  }
                : { animation: "var(--animate-seal-ring-idle)" }
            }
          />
          <div
            className="absolute inset-0 grid place-items-center rounded-full bg-bordeaux-900 text-[36px] leading-none"
            style={{
              // Un or très clair, décoratif, sur le bordeaux le plus sombre :
              // il n'a rien à lire, il a à briller.
              color: "#f7e7c6",
              boxShadow: "0 8px 22px -8px #00000088",
              animation: opened ? undefined : "var(--animate-seal-pulse)",
            }}
          >
            ♥
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-0 w-0">
            {burst?.map((p, i) => (
              <div
                key={i}
                style={
                  {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: p.size,
                    height: p.size,
                    marginLeft: -3,
                    marginTop: -3,
                    borderRadius: p.round ? "50%" : "60% 40% 55% 45%",
                    background: p.color,
                    "--dx": `${p.dx.toFixed(1)}px`,
                    "--dy": `${p.dy.toFixed(1)}px`,
                    "--rot": `${p.rot}deg`,
                    animation:
                      "petal-burst 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
                    animationDelay: `${p.delay.toFixed(3)}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div
          className="relative max-w-[86vw] flex-[0_1_auto]"
          style={{
            height: "min(34vh, 270px)",
            // Le rapport du cadre vient du design ; l'image s'y pose en
            // `contain`, donc un dixième de degré d'écart ne se voit pas.
            aspectRatio: "1262 / 866",
            marginTop: "min(6vh, 44px)",
            animation: opened
              ? "var(--animate-envelope-away)"
              : "var(--animate-envelope-idle)",
          }}
        >
          {/* L'enveloppe **est** le bouton : c'est ce que l'indication dit de
              toucher, donc c'est ce qui doit prendre le focus. Elle ne contient
              qu'une image et un libellé — un `<button>` n'accepte pas de bloc.

              `focus-visible:outline-none` lève ici, et ici seulement, l'anneau
              de focus global de `index.css`. Il dessinait un rectangle autour
              d'une image découpée, ce qui se voit mal et se voyait dès le
              chargement — le focus est posé par le code, et Chrome traite un
              focus programmatique comme un focus clavier.

              Ce que ça coûte est faible **parce qu'il n'y a qu'une seule
              commande à l'écran** et qu'elle a déjà le focus : il n'existe pas
              d'autre endroit où celui-ci pourrait être. La règle globale reste
              entière partout ailleurs, et notamment sur le formulaire de
              réponse, où plusieurs contrôles se disputent le focus. */}
          <button
            ref={buttonRef}
            type="button"
            onClick={open}
            className="absolute inset-0 block w-full cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:outline-none"
          >
            <img
              src="/decor/enveloppe-fermee.webp"
              alt=""
              aria-hidden="true"
              width={500}
              height={350}
              className="h-full w-full select-none object-contain"
              style={{ filter: "drop-shadow(0 30px 44px rgb(0 0 0 / 0.35))" }}
            />
            <span className="sr-only">Ouvrir l'invitation</span>
          </button>

          <Rose side="left" />
          <Rose side="right" />
        </div>

        <p
          aria-hidden="true"
          className="font-sans text-[12px] uppercase tracking-[0.34em] text-ink-muted"
          style={{
            marginTop: "min(5vh, 40px)",
            transition: "opacity 400ms",
            opacity: opened ? 0 : 1,
            animation: opened ? undefined : "var(--animate-hint-bob)",
          }}
        >
          Cliquez sur l'enveloppe
        </p>
      </div>
    </div>
  );
}

/**
 * Les deux branches de roses posées aux coins de l'enveloppe. Elles débordent
 * largement du cadre — c'est voulu, elles l'encadrent au lieu de le décorer.
 *
 * `pointer-events-none` : elles passent par-dessus le bouton, et sans ça elles
 * en mangeraient les coins.
 */
function Rose({ side }: { side: "left" | "right" }) {
  const mirrored = side === "right";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-[3] w-[38%]"
      style={{
        [side]: "-31%",
        top: "-48%",
        transform: mirrored ? "rotate(9deg) scaleX(-1)" : "rotate(-9deg)",
      }}
    >
      <div
        style={{
          animation: "var(--animate-rose-in)",
          animationDelay: mirrored ? "180ms" : undefined,
        }}
      >
        <img
          src="/decor/branche-fleurie.webp"
          alt=""
          className="block w-full select-none"
          style={{
            filter: "drop-shadow(0 14px 22px rgb(0 0 0 / 0.28))",
            animation: `rose-drift ${mirrored ? "6s" : "5s"} ease-in-out infinite`,
            animationDelay: mirrored ? "400ms" : undefined,
          }}
        />
      </div>
    </div>
  );
}
