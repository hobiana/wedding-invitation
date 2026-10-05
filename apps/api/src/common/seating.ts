/**
 * L'occupation d'une table — **réexportée**, plus définie ici.
 *
 * La formule est descendue dans `@invitation-app/shared` : le front en avait
 * recopié une deuxième version dans `TableBoard`, et le menu « Placer à la
 * table… » en aurait fait une troisième. Ce fichier reste pour que les trois
 * portes de l'API — placer un foyer, éditer la table, éditer un foyer déjà
 * placé — continuent d'importer le même symbole au même chemin : aucun
 * appelant ne change.
 *
 * Elles doivent s'accorder sur le remplissage d'une table, sinon l'une d'elles
 * devient une porte dérobée vers un état que les deux autres refusent. On
 * l'importe, on ne la réécrit pas — et cela vaut désormais des deux côtés du
 * contrat.
 */
export { seatsFor, seatsTaken } from '@invitation-app/shared';
export type { Seated } from '@invitation-app/shared';
