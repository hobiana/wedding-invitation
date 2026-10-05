import {
  seatsFor as seatsForShared,
  seatsTaken as seatsTakenShared,
} from '@invitation-app/shared';
import { seatsFor, seatsTaken, type Seated } from './seating';

// La formule vit deux fois : ici, parce que `packages/shared` est du
// TypeScript brut que Node ne charge pas au runtime (un import de valeur y
// fait planter `node dist/main`), et dans `packages/shared`, que le web
// importe. Ce test est ce qui les garde d'accord.
const cases: Seated[] = [
  { confirmedCount: null, allocatedSeats: 4 },
  { confirmedCount: 0, allocatedSeats: 4 },
  { confirmedCount: 2, allocatedSeats: 4 },
  { confirmedCount: 4, allocatedSeats: 4 },
];

describe('seating parity with @invitation-app/shared', () => {
  it.each(cases)('seatsFor agrees for %j', (household) => {
    expect(seatsFor(household)).toBe(seatsForShared(household));
  });

  it('seatsTaken agrees on a mixed table', () => {
    expect(seatsTaken(cases)).toBe(seatsTakenShared(cases));
  });

  it('a household that has not answered holds its full allocation', () => {
    expect(seatsFor({ confirmedCount: null, allocatedSeats: 4 })).toBe(4);
    expect(seatsFor({ confirmedCount: 0, allocatedSeats: 4 })).toBe(0);
  });
});
