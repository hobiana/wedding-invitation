import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Une section qui se lève quand l'invité arrive dessus.
 *
 * La cascade du design ne couvre que le premier écran : au moment où
 * l'enveloppe s'en va, les six premiers blocs montent l'un après l'autre. Tout
 * ce qui est plus bas s'animait donc dans le vide, et la page devenait muette
 * dès qu'on descendait. C'est ce que ce composant rend au reste de la page,
 * avec **exactement le même mouvement** — mêmes keyframes, même courbe, même
 * durée. Une seconde langue d'animation dans une même page se remarque.
 *
 * ---
 *
 * **La règle qui gouverne tout ce fichier : le contenu est visible par défaut,
 * et il ne devient invisible qu'une fois qu'on a la preuve de savoir le
 * ramener.**
 *
 * C'est l'inverse du réflexe — on masque en CSS, on démasque en JS — et
 * l'inverse est la seule version sûre. Une section masquée que personne ne
 * démasque, c'est une invitation blanche chez un invité, et personne ne
 * l'apprend jamais : il ne va pas écrire pour dire que la page était vide, il
 * va simplement ne pas répondre. Le défaut par défaut doit donc être « on
 * voit tout ».
 *
 * D'où la forme : `armed` est décidé **avant le premier rendu**, et il est
 * faux dès qu'un doute existe — pas d'`IntersectionObserver`, ou mouvement
 * réduit demandé. Dans ce cas aucun attribut n'est écrit, aucune règle CSS ne
 * s'applique, et le composant n'est plus qu'une `div` autour de ses enfants.
 */

/**
 * Le seuil est **zéro**, et c'est une correction, pas un réglage par défaut.
 *
 * Un seuil de 15 % demande que 15 % de la surface de la cible soit visible.
 * Deux blocs de cette page n'y arrivent jamais :
 *
 * - **Le plan de table mesure 0 px de haut** tant que l'organisateur ne l'a pas
 *   activé. Une cible sans surface a un ratio nul par construction ; elle ne
 *   franchit aucun seuil positif, et resterait masquée pour toujours. Mesuré
 *   dans le navigateur, pas supposé.
 * - **Une section plus haute que l'écran** plafonne à `hauteur d'écran /
 *   hauteur de section`. Le lieu fait déjà 599 px ; sur un téléphone court, la
 *   marge se réduit.
 *
 * À zéro, le ratio ne compte plus : il suffit que la cible touche la fenêtre.
 * C'est la marge basse qui décide du moment, et elle est en **pixels** et non
 * en pourcentage — 80 px veulent dire la même chose sur toutes les tailles
 * d'écran, et ne peuvent pas devenir plus grands que le dernier bloc de la
 * page, qui ne se lèverait alors jamais.
 */
const SEUIL = 0;
const MARGE = "0px 0px -80px 0px";

function peutAnimer(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof IntersectionObserver === "undefined") return false;
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return false;
  }
  return true;
}

export function Reveal({ children }: { children: ReactNode }) {
  // Décidé une fois, avant la première peinture. Un `useEffect` arriverait
  // après, et la section serait peinte visible puis masquée : un clignotement.
  const [armed] = useState(peutAnimer);
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!armed || shown) return;
    const element = ref.current;
    // Le filet : si l'élément manque à l'appel, on montre plutôt que de laisser
    // un bloc masqué sans personne pour l'ouvrir.
    if (!element) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          // On ne regarde plus : remonter la page ne refait pas jouer le fondu,
          // et une invitation qui clignote à chaque passage est pénible.
          observer.disconnect();
        }
      },
      { threshold: SEUIL, rootMargin: MARGE },
    );

    try {
      observer.observe(element);
    } catch {
      setShown(true);
      return;
    }
    return () => observer.disconnect();
  }, [armed, shown]);

  return (
    <div
      ref={ref}
      data-reveal-block={armed ? (shown ? "shown" : "hidden") : undefined}
    >
      {children}
    </div>
  );
}
