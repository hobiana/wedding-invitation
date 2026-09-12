import { useEffect, useState } from "react";

/**
 * Le point de bascule, lu une fois et suivi.
 *
 * Il existe pour que le `DataTable` rende **soit** une table **soit** des
 * cartes, jamais les deux : deux rendus simultanés cachés l'un par CSS
 * dupliquent chaque nom dans le DOM, et tous les tests de la page qui
 * l'emploie se mettent à trouver deux éléments là où il n'y en a qu'un à
 * l'écran.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const liste = window.matchMedia(query);
    setMatches(liste.matches);
    const suivre = (evenement: MediaQueryListEvent) => setMatches(evenement.matches);
    liste.addEventListener("change", suivre);
    return () => liste.removeEventListener("change", suivre);
  }, [query]);

  return matches;
}
