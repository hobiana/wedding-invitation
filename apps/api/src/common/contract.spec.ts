import type { Household } from '@prisma/client';
import { toHouseholdAdminDto, toTableDto } from './contract';

function householdRow(overrides: Partial<Household> = {}): Household {
  return {
    id: 'h1',
    displayName: 'Famille A',
    allocatedSeats: 4,
    memberNames: ['Anna', 'Bob'],
    status: 'CONFIRMED',
    confirmedCount: 2,
    dietaryNotes: 'sans porc',
    message: 'avec joie',
    tableId: 't1',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-02T11:00:00.000Z'),
    ...overrides,
  };
}

describe('toHouseholdAdminDto', () => {
  // Deux horodatages distincts dans le décor : un mapping qui les intervertit
  // passerait inaperçu s'ils portaient la même valeur.
  it('carries every column of the admin contract, timestamps as ISO strings', () => {
    expect(toHouseholdAdminDto(householdRow())).toEqual({
      id: 'h1',
      displayName: 'Famille A',
      allocatedSeats: 4,
      memberNames: ['Anna', 'Bob'],
      status: 'CONFIRMED',
      confirmedCount: 2,
      dietaryNotes: 'sans porc',
      message: 'avec joie',
      tableId: 't1',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-02-02T11:00:00.000Z',
    });
  });

  // L'invariant qui a cassé trois fois. Le foyer PENDING n'a pas répondu :
  // sa case reste vide, elle ne vaut pas zéro.
  it('keeps a PENDING household confirmedCount at null', () => {
    const dto = toHouseholdAdminDto(
      householdRow({ status: 'PENDING', confirmedCount: null }),
    );

    expect(dto.confirmedCount).toBeNull();
  });
});

describe('toTableDto', () => {
  // Le plan de table n'a besoin que de quoi calculer une occupation et
  // afficher une étiquette. Le contrat le dit ; la requête renvoyait le foyer
  // entier, et personne ne s'en apercevait puisque le front, lui, tape juste.
  it('reduces each seated household to the summary the contract declares', () => {
    const dto = toTableDto({
      id: 't1',
      name: "Table d'honneur",
      capacity: 10,
      households: [householdRow(), householdRow({ id: 'h2' })],
    });

    expect(dto).toEqual({
      id: 't1',
      name: "Table d'honneur",
      capacity: 10,
      households: [
        {
          id: 'h1',
          displayName: 'Famille A',
          allocatedSeats: 4,
          confirmedCount: 2,
          status: 'CONFIRMED',
        },
        {
          id: 'h2',
          displayName: 'Famille A',
          allocatedSeats: 4,
          confirmedCount: 2,
          status: 'CONFIRMED',
        },
      ],
    });
  });

  it('describes an empty table with an empty household list', () => {
    const dto = toTableDto({
      id: 't2',
      name: 'Table 2',
      capacity: 8,
      households: [],
    });

    expect(dto.households).toEqual([]);
  });
});
