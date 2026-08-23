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
 */
export function seatsFor(household: Seated): number {
  return household.confirmedCount ?? household.allocatedSeats;
}

export function seatsTaken(households: Seated[]): number {
  return households.reduce((sum, h) => sum + seatsFor(h), 0);
}
