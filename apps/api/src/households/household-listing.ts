import type { Household, RsvpStatus } from '@prisma/client';
import type { HouseholdSortKey, SortOrder } from '@invitation-app/shared';

/**
 * Recherche et tri de la liste des foyers, en mémoire.
 *
 * Pas en SQL, délibérément : quelques centaines de foyers au plus, et une
 * recherche insensible aux accents en base demanderait l'extension `unaccent`
 * et une migration. Le contrat de `GET /admin/households` ne bouge pas le jour
 * où on y passe.
 */

/**
 * Sans casse et sans accent. `NFD` sépare la lettre de son diacritique, et
 * l'intervalle U+0300–U+036F est celui des diacritiques combinants : « eric »
 * trouve « Éric ». Écrite ici et non importée : l'API ne charge aucune valeur de
 * `packages/shared`.
 *
 * L'intervalle est construit par codes plutôt qu'écrit dans la regex : des
 * diacritiques combinants littéraux y sont invisibles à la relecture, et les
 * outils d'édition de ce dépôt transforment une séquence d'échappement
 * unicode en caractère littéral.
 */
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

export function fold(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/**
 * Comme le filtre du front, la matière cherchée est le nom affiché et les
 * prénoms mis bout à bout : « rabe raissa » trouve la famille Rabe dont un
 * membre s'appelle Raïssa.
 */
export function matchesSearch(household: Household, query: string): boolean {
  const needle = fold(query.trim());
  if (needle === '') return true;
  return fold(
    [household.displayName, ...household.memberNames].join(' '),
  ).includes(needle);
}

/**
 * « Famille Rabe » se range à R. Seul un « Famille » en tête est retiré, et
 * seulement s'il est suivi d'autre chose : un foyer nommé « Famille » tout
 * court garde son nom.
 */
function nameKey(household: Household): string {
  return fold(household.displayName.trim().replace(/^famille\s+/i, ''));
}

/** Le plus à traiter d'abord, pas l'ordre alphabétique des valeurs. */
const STATUS_RANK: Record<RsvpStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  DECLINED: 2,
};

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Un comparateur par clé, croissant. `order=desc` en inverse le signe ; les
 * règles qui ne doivent PAS s'inverser (départage par `id`, `null` en dernier)
 * sont appliquées en dehors, dans `compareHouseholds`.
 */
const PRIMARY: Record<
  HouseholdSortKey,
  (a: Household, b: Household) => number
> = {
  name: (a, b) => compareText(nameKey(a), nameKey(b)),
  seats: (a, b) => a.allocatedSeats - b.allocatedSeats,
  status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  createdAt: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
};

/**
 * Second critère du tri par places : `confirmedCount`, les foyers en attente
 * (`null`) en dernier quel que soit le sens — ils n'ont pas de chiffre, les
 * faire valoir 0 les mélangerait aux foyers qui ont décliné.
 */
function compareConfirmed(a: Household, b: Household, sign: number): number {
  if (a.confirmedCount === b.confirmedCount) return 0;
  if (a.confirmedCount === null) return 1;
  if (b.confirmedCount === null) return -1;
  return sign * (a.confirmedCount - b.confirmedCount);
}

export function compareHouseholds(
  sort: HouseholdSortKey,
  order: SortOrder,
): (a: Household, b: Household) => number {
  const sign = order === 'desc' ? -1 : 1;
  return (a, b) =>
    sign * PRIMARY[sort](a, b) ||
    (sort === 'seats' ? compareConfirmed(a, b, sign) : 0) ||
    // Toujours croissant : sans départage stable, deux foyers égaux peuvent
    // permuter d'une requête à l'autre et l'un d'eux apparaître sur deux
    // pages, ou sur aucune.
    compareText(a.id, b.id);
}
