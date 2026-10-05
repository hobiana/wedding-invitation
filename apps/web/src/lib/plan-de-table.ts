import { seatsFor, seatsTaken, type RsvpStatus, type Seated, type TableDto } from "@invitation-app/shared";

/**
 * Les calculs du plan de table, communs au bureau et au téléphone.
 *
 * Tout passe par `seatsFor` / `seatsTaken`, la définition unique de
 * l'occupation que l'API emploie pour refuser : un foyer sans réponse y compte
 * pour toute son allocation, jamais pour zéro. Ces fonctions n'autorisent rien
 * — entre le chargement et le clic, un autre onglet a pu remplir la table ;
 * c'est le serveur qui tranche.
 */

/**
 * L'identifiant de la zone de dépôt « À placer » : y lâcher un foyer le retire
 * de sa table. C'est la valeur que `dragEndTarget` (`TableBoard.tsx`) traduit
 * en `tableId: null` — les deux doivent rester égales.
 */
export const ZONE_A_PLACER = "unassigned";

/** Places libres d'une table ; négatif quand elle déborde. */
export function placesLibresDe(table: TableDto): number {
  return table.capacity - seatsTaken(table.households);
}

export function peutAccueillir(table: TableDto, foyer: Seated): boolean {
  return placesLibresDe(table) >= seatsFor(foyer);
}

/**
 * Ce qu'une table peut faire pour un foyer, en trois mots — c'est la ligne de
 * la feuille de choix au téléphone : « 5 places libres », « 3 places libres ·
 * trop petite », « Complète ».
 */
export function choixDeTable(
  table: TableDto,
  foyer: Seated,
): { etat: "disponible" | "trop-petite" | "complete"; libres: number } {
  const libres = placesLibresDe(table);
  if (libres <= 0) return { etat: "complete", libres };
  if (libres < seatsFor(foyer)) return { etat: "trop-petite", libres };
  return { etat: "disponible", libres };
}

/**
 * Les foyers à placer : assis à aucune table et n'ayant pas décliné
 * (décision du commanditaire). L'ordre est celui du serveur.
 *
 * « Assis » se lit dans les tables et non dans `tableId` : c'est ce que la
 * grille affiche, et les deux viennent de deux requêtes distinctes.
 */
export function foyersAPlacer<T extends { id: string; status: RsvpStatus }>(foyers: T[], tables: TableDto[]): T[] {
  const assis = new Set(tables.flatMap((t) => t.households.map((h) => h.id)));
  return foyers.filter((f) => !assis.has(f.id) && f.status !== "DECLINED");
}

/**
 * - `repos` : l'état normal.
 * - `accueille` : un foyer est en cours de placement et tient à cette table —
 *   elle est en surbrillance.
 * - `trop-petite` : il n'y tient pas — elle est estompée **et le dit**.
 */
export type EtatDeTable = "repos" | "accueille" | "trop-petite";

/** Le foyer qu'on place (clic ou glisser), et la table qu'il quitte s'il est assis. */
export interface FoyerEnJeu {
  foyer: Seated & { id: string };
  depuis: string | null;
}

export function etatDeTable(table: TableDto, enJeu: FoyerEnJeu | null): EtatDeTable {
  if (!enJeu || table.id === enJeu.depuis) return "repos";
  return peutAccueillir(table, enJeu.foyer) ? "accueille" : "trop-petite";
}

/**
 * Ce que veut dire un dépôt, à partir de `dragEndTarget` et de la table d'où
 * le foyer part. Reposé où il était, il ne se passe rien — pas de requête.
 */
export function issueDuGlisser(
  cible: { householdId: string; tableId: string | null } | null,
  depuis: string | null,
): { geste: "placer"; householdId: string; tableId: string } | { geste: "retirer"; householdId: string } | null {
  if (!cible || cible.tableId === depuis) return null;
  return cible.tableId === null
    ? { geste: "retirer", householdId: cible.householdId }
    : { geste: "placer", householdId: cible.householdId, tableId: cible.tableId };
}

/**
 * La capacité saisie, ou `null` si elle ne vaut pas une table. Gardée en texte
 * dans l'état : un champ numérique vidé vaut `""`, et `Number("")` donnerait 0
 * sans que l'organisateur l'ait tapé.
 */
export function capaciteValide(saisie: string): number | null {
  const n = Number(saisie);
  return saisie.trim() !== "" && Number.isInteger(n) && n >= 1 ? n : null;
}

export const CAPACITE_INVALIDE = "La capacité doit être d'au moins 1 place.";

export interface Bilan {
  placesAttribuees: number;
  placesTotales: number;
  foyersAPlacer: number;
  placesAPlacer: number;
}

/** Les chiffres de l'en-tête : « 35 / 52 places attribuées », « 6 foyers à placer », « 16 places ». */
export function bilan(tables: TableDto[], aPlacer: Seated[]): Bilan {
  return {
    placesAttribuees: tables.reduce((somme, t) => somme + seatsTaken(t.households), 0),
    placesTotales: tables.reduce((somme, t) => somme + t.capacity, 0),
    foyersAPlacer: aPlacer.length,
    placesAPlacer: seatsTaken(aPlacer),
  };
}
