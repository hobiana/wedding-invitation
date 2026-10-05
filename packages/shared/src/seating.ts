/**
 * L'occupation d'une table, définie **une seule fois** pour les deux côtés.
 *
 * Elle vivait dans `apps/api/src/common/seating.ts`, hors de portée du front,
 * qui en avait donc recopié la formule dans `TableBoard`. Le menu « Placer à
 * la table… » en aurait fait une troisième copie. Elle descend ici parce que
 * `@invitation-app/shared` est le seul endroit que l'API et le web importent
 * tous les deux ; `api/src/common/seating.ts` la réexporte, si bien que les
 * trois portes de l'API continuent d'importer le même symbole au même chemin.
 *
 * C'est du code exécutable et non un type : c'est le premier de ce paquet, qui
 * ne portait jusqu'ici que le contrat. Il n'a ni dépendance ni effet de bord,
 * et il s'efface dans le bundle du web comme dans le `dist` de l'API.
 */
export interface Seated {
  confirmedCount: number | null;
  allocatedSeats: number;
}

/**
 * Seats one household occupies at its table. A household that has not answered
 * yet still holds its full allocation — the planner must not seat someone into
 * space a late reply would reclaim (a PENDING household can be assigned a
 * table on purpose, so this case is the norm, not an edge).
 *
 * Three separate doors lead into a table: assigning a household to it, editing
 * the table, and editing a household already sitting at it. They have to agree
 * on how full it is, or one of them becomes a back door into a state the other
 * two refuse. Hence a single definition, imported rather than restated.
 *
 * Le front en ouvre une quatrième — l'affichage des places restantes dans le
 * menu de placement. Elle n'autorise rien : c'est l'API qui refuse. Mais elle
 * doit dire la même chose que le serveur, sans quoi le menu promet une place
 * que le serveur reprend.
 */
export function seatsFor(household: Seated): number {
  return household.confirmedCount ?? household.allocatedSeats;
}

export function seatsTaken(households: Seated[]): number {
  return households.reduce((sum, h) => sum + seatsFor(h), 0);
}
