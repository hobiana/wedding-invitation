/**
 * L'accord du nom avec le nombre, pour le plan de table. « 1 places » et
 * « 1 foyers » sont des fautes dans une interface en français sans exception.
 *
 * Règle française, et non anglaise : zéro reste au singulier (« 0 place »).
 */
function accorder(n: number, singulier: string, pluriel: string): string {
  return `${n} ${n >= 2 ? pluriel : singulier}`;
}

export function places(n: number): string {
  return accorder(n, "place", "places");
}

/** « 1 place restante », « 6 places restantes » — l'adjectif s'accorde aussi. */
export function placesRestantes(n: number): string {
  return accorder(n, "place restante", "places restantes");
}

/** « 1 place libre », « 3 places libres » — sous chaque table du plan. */
export function placesLibres(n: number): string {
  return accorder(n, "place libre", "places libres");
}

export function foyers(n: number): string {
  return accorder(n, "foyer", "foyers");
}
