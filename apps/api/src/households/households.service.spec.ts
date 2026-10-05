import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Household } from '@prisma/client';
import { HouseholdsService } from './households.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateArgs {
  data: {
    id: string;
    displayName: string;
    allocatedSeats: number;
    memberNames: string[];
  };
}

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let prisma: {
    household: {
      create: jest.Mock<Promise<CreateArgs['data']>, [CreateArgs]>;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        create: jest.fn<Promise<CreateArgs['data']>, [CreateArgs]>(),
        findMany: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it('generates an 8-character id and creates the household', async () => {
    prisma.household.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: data.id }),
    );
    const result = await service.create({
      displayName: 'Famille Test',
      allocatedSeats: 3,
    });
    expect(result.id).toHaveLength(8);

    const [[{ data }]] = prisma.household.create.mock.calls;
    expect(data).toEqual(
      expect.objectContaining({
        displayName: 'Famille Test',
        allocatedSeats: 3,
        memberNames: [],
      }),
    );
  });
});

// La liste de l'écran Foyers est paginée côté serveur. La recherche et le tri
// se font en mémoire, après lecture des foyers du statut demandé : le `total`
// doit donc compter après filtre et avant découpe, sinon le pied de page
// annonce des pages qui n'existent pas.
describe('HouseholdsService.findAll', () => {
  let service: HouseholdsService;
  let prisma: { household: { findMany: jest.Mock } };

  let created = 0;
  function row(overrides: Partial<Household>): Household {
    created += 1;
    return {
      id: `h${created}`,
      displayName: `Foyer ${created}`,
      allocatedSeats: 2,
      memberNames: [],
      status: 'PENDING',
      confirmedCount: null,
      dietaryNotes: null,
      message: null,
      tableId: null,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, created)),
      updatedAt: new Date(Date.UTC(2026, 0, 1, 0, created)),
      ...overrides,
    };
  }

  const defaults = {
    limit: 100,
    offset: 0,
    sort: 'createdAt' as const,
    order: 'asc' as const,
  };

  beforeEach(async () => {
    created = 0;
    prisma = { household: { findMany: jest.fn().mockResolvedValue([]) } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  const ids = (page: { items: Household[] }) => page.items.map((h) => h.id);

  it('slices the requested page and reports the total before slicing', async () => {
    prisma.household.findMany.mockResolvedValue(
      Array.from({ length: 7 }, () => row({})),
    );

    const page = await service.findAll({ ...defaults, limit: 3, offset: 3 });

    expect(ids(page)).toEqual(['h4', 'h5', 'h6']);
    expect(page.total).toBe(7);
    expect(page.limit).toBe(3);
    expect(page.offset).toBe(3);
  });

  it('returns an empty page past the end, with the true total', async () => {
    prisma.household.findMany.mockResolvedValue([row({}), row({})]);

    const page = await service.findAll({ ...defaults, offset: 10 });

    expect(page.items).toEqual([]);
    expect(page.total).toBe(2);
  });

  it('filters by status in the database query', async () => {
    await service.findAll({ ...defaults, status: 'DECLINED' });

    expect(prisma.household.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'DECLINED' } }),
    );
  });

  it('reads every household when no status is asked for', async () => {
    await service.findAll(defaults);

    const [[args]] = prisma.household.findMany.mock.calls as [
      [{ where?: unknown }],
    ];
    expect(args.where ?? {}).toEqual({});
  });

  // Personne ne tape les accents dans un champ de recherche.
  it('finds a household by display name regardless of case and accents', async () => {
    prisma.household.findMany.mockResolvedValue([
      row({ displayName: 'Famille Éric Rabe' }),
      row({ displayName: 'Famille Zo' }),
    ]);

    const page = await service.findAll({ ...defaults, q: '  ERIC ' });

    expect(ids(page)).toEqual(['h1']);
    expect(page.total).toBe(1);
  });

  it('finds a household by one of its member names', async () => {
    prisma.household.findMany.mockResolvedValue([
      row({ displayName: 'Famille Rabe', memberNames: ['Raïssa', 'Tojo'] }),
      row({ displayName: 'Famille Zo', memberNames: ['Hanta'] }),
    ]);

    const page = await service.findAll({ ...defaults, q: 'raissa' });

    expect(ids(page)).toEqual(['h1']);
  });

  it('counts the total after the search, before the slice', async () => {
    prisma.household.findMany.mockResolvedValue([
      row({ displayName: 'Rabe A' }),
      row({ displayName: 'Zo' }),
      row({ displayName: 'Rabe B' }),
      row({ displayName: 'Rabe C' }),
    ]);

    const page = await service.findAll({ ...defaults, q: 'rabe', limit: 2 });

    expect(ids(page)).toEqual(['h1', 'h3']);
    expect(page.total).toBe(3);
  });

  it('treats a blank search as no search', async () => {
    prisma.household.findMany.mockResolvedValue([row({}), row({})]);

    const page = await service.findAll({ ...defaults, q: '   ' });

    expect(page.total).toBe(2);
  });

  describe('sort=name', () => {
    // « Famille Rabe » se range à R, pas à F ; « Élodie » ne passe pas après
    // « Zo » ; seul un « Famille » en tête est retiré.
    it('ignores a leading "Famille", case and accents', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ displayName: 'Zo & Hanta' }), // h1
        row({ displayName: 'Famille Rabe' }), // h2
        row({ displayName: 'Élodie Andria' }), // h3
        row({ displayName: 'Jean & Marie Rabe' }), // h4
        row({ displayName: 'FAMILLE bema' }), // h5
        row({ displayName: 'Tsiry Famille' }), // h6
      ]);

      const page = await service.findAll({ ...defaults, sort: 'name' });

      expect(ids(page)).toEqual(['h5', 'h3', 'h4', 'h2', 'h6', 'h1']);
    });

    it('reverses with order=desc', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ displayName: 'Famille Rabe' }),
        row({ displayName: 'Élodie' }),
        row({ displayName: 'Zo' }),
      ]);

      const page = await service.findAll({
        ...defaults,
        sort: 'name',
        order: 'desc',
      });

      expect(ids(page)).toEqual(['h3', 'h1', 'h2']);
    });

    // Sans départage, deux noms égaux peuvent changer d'ordre d'une requête à
    // l'autre et un foyer apparaître sur deux pages, ou sur aucune.
    it('breaks ties by id so that pages never overlap', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ id: 'zz', displayName: 'Famille Rabe' }),
        row({ id: 'aa', displayName: 'Rabe' }),
        row({ id: 'mm', displayName: 'rabe' }),
      ]);

      const asc = await service.findAll({ ...defaults, sort: 'name' });
      const desc = await service.findAll({
        ...defaults,
        sort: 'name',
        order: 'desc',
      });

      expect(ids(asc)).toEqual(['aa', 'mm', 'zz']);
      expect(ids(desc)).toEqual(['aa', 'mm', 'zz']);
    });
  });

  describe('sort=seats', () => {
    it('orders by allocated seats, then confirmed count with pending last', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ allocatedSeats: 4, status: 'PENDING', confirmedCount: null }), // h1
        row({ allocatedSeats: 2, status: 'CONFIRMED', confirmedCount: 2 }), // h2
        row({ allocatedSeats: 4, status: 'CONFIRMED', confirmedCount: 3 }), // h3
        row({ allocatedSeats: 4, status: 'DECLINED', confirmedCount: 0 }), // h4
        row({ allocatedSeats: 1, status: 'PENDING', confirmedCount: null }), // h5
      ]);

      const page = await service.findAll({ ...defaults, sort: 'seats' });

      expect(ids(page)).toEqual(['h5', 'h2', 'h4', 'h3', 'h1']);
    });

    // Les « en attente » n'ont pas de chiffre : ils restent en queue de leur
    // groupe dans les deux sens, plutôt que de valoir 0 ou l'infini.
    it('keeps pending households last within their group in desc order', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ allocatedSeats: 4, status: 'PENDING', confirmedCount: null }), // h1
        row({ allocatedSeats: 2, status: 'CONFIRMED', confirmedCount: 2 }), // h2
        row({ allocatedSeats: 4, status: 'CONFIRMED', confirmedCount: 3 }), // h3
        row({ allocatedSeats: 4, status: 'DECLINED', confirmedCount: 0 }), // h4
      ]);

      const page = await service.findAll({
        ...defaults,
        sort: 'seats',
        order: 'desc',
      });

      expect(ids(page)).toEqual(['h3', 'h4', 'h1', 'h2']);
    });
  });

  describe('sort=status', () => {
    // Le plus à traiter d'abord — pas l'ordre alphabétique des valeurs, qui
    // mettrait CONFIRMED devant.
    it('orders pending, then confirmed, then declined', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ status: 'DECLINED', confirmedCount: 0 }), // h1
        row({ status: 'CONFIRMED', confirmedCount: 2 }), // h2
        row({ status: 'PENDING' }), // h3
        row({ status: 'CONFIRMED', confirmedCount: 1 }), // h4
      ]);

      const asc = await service.findAll({ ...defaults, sort: 'status' });
      const desc = await service.findAll({
        ...defaults,
        sort: 'status',
        order: 'desc',
      });

      expect(ids(asc)).toEqual(['h3', 'h2', 'h4', 'h1']);
      expect(ids(desc)).toEqual(['h1', 'h2', 'h4', 'h3']);
    });
  });

  describe('sort=createdAt', () => {
    it('orders oldest first by default, newest first in desc', async () => {
      prisma.household.findMany.mockResolvedValue([
        row({ createdAt: new Date('2026-03-01') }), // h1
        row({ createdAt: new Date('2026-01-01') }), // h2
        row({ createdAt: new Date('2026-02-01') }), // h3
      ]);

      const asc = await service.findAll(defaults);
      const desc = await service.findAll({ ...defaults, order: 'desc' });

      expect(ids(asc)).toEqual(['h2', 'h3', 'h1']);
      expect(ids(desc)).toEqual(['h1', 'h3', 'h2']);
    });
  });

  // Le tri ne doit jamais toucher aux lignes : un PENDING reste à null.
  it('hands pending households back with a null confirmedCount', async () => {
    prisma.household.findMany.mockResolvedValue([
      row({ status: 'PENDING', confirmedCount: null }),
    ]);

    const page = await service.findAll({ ...defaults, sort: 'seats' });

    expect(page.items[0].confirmedCount).toBeNull();
  });
});

describe('HouseholdsService.update', () => {
  let service: HouseholdsService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it('throws NotFoundException for an unknown household', async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { displayName: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  // The public RSVP path (InvitationService.submitRsvp) refuses a
  // confirmedCount above allocatedSeats. The admin path fed the same seating
  // capacity maths, so it has to refuse it too.
  it('rejects a confirmedCount above the existing allocatedSeats', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
      confirmedCount: 1,
    });

    await expect(service.update('h1', { confirmedCount: 5 })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('rejects shrinking allocatedSeats below the already-confirmed count', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 6,
      confirmedCount: 5,
    });

    await expect(service.update('h1', { allocatedSeats: 3 })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('accepts a confirmedCount raised together with allocatedSeats in one patch', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
      confirmedCount: 2,
    });

    await expect(
      service.update('h1', { allocatedSeats: 6, confirmedCount: 5 }),
    ).resolves.not.toThrow();
    expect(prisma.household.update).toHaveBeenCalledWith({
      where: { id: 'h1' },
      data: { allocatedSeats: 6, confirmedCount: 5 },
    });
  });

  it('allows a confirmedCount equal to allocatedSeats', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 4,
      confirmedCount: null,
    });

    await expect(
      service.update('h1', { confirmedCount: 4 }),
    ).resolves.not.toThrow();
  });

  it('leaves a household with no confirmedCount alone when patching other fields', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 4,
      confirmedCount: null,
    });

    await expect(
      service.update('h1', { displayName: 'Famille Renommée' }),
    ).resolves.not.toThrow();
  });
});

// The public RSVP path (InvitationService.submitRsvp) already ties status and
// confirmedCount together: it demands a count >= 1 to confirm, and zeroes the
// count on a decline. The admin path skipped both, so an admin could write
// states a guest cannot: CONFIRMED with no count (the household then occupies
// zero seats in the table planner, because TablesService reads
// `confirmedCount ?? allocatedSeats` and an explicit 0 wins over the `??`), or
// DECLINED with a stale count (the dashboard sums it into totalConfirmedGuests
// and reports guests nobody expects).
describe('HouseholdsService.update status/confirmedCount coherence', () => {
  let service: HouseholdsService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it('refuses to confirm a household without a confirmedCount', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'PENDING',
      allocatedSeats: 4,
      confirmedCount: null,
      tableId: null,
    });

    await expect(
      service.update('h1', { status: 'CONFIRMED' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('refuses to confirm a household with a confirmedCount of 0', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'PENDING',
      allocatedSeats: 4,
      confirmedCount: null,
      tableId: null,
    });

    await expect(
      service.update('h1', { status: 'CONFIRMED', confirmedCount: 0 }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('keeps the existing confirmedCount when confirming a household that already has one', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'CONFIRMED',
      allocatedSeats: 4,
      confirmedCount: 3,
      tableId: null,
    });

    await expect(
      service.update('h1', { status: 'CONFIRMED' }),
    ).resolves.not.toThrow();
    expect(prisma.household.update).toHaveBeenCalled();
  });

  it('zeroes confirmedCount when the admin marks a household as declined', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'CONFIRMED',
      allocatedSeats: 4,
      confirmedCount: 3,
      tableId: null,
    });

    await service.update('h1', { status: 'DECLINED' });

    const [[{ data }]] = prisma.household.update.mock.calls;
    expect(data.confirmedCount).toBe(0);
  });

  it('zeroes confirmedCount even when the caller sends one alongside DECLINED', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'PENDING',
      allocatedSeats: 4,
      confirmedCount: null,
      tableId: null,
    });

    await service.update('h1', { status: 'DECLINED', confirmedCount: 2 });

    const [[{ data }]] = prisma.household.update.mock.calls;
    expect(data.confirmedCount).toBe(0);
  });

  // A count sent without a status must still be judged against the status the
  // household ends up in, or `PATCH { confirmedCount: 3 }` on a declined
  // household quietly resurrects three guests without ever naming a status.
  it('zeroes a confirmedCount patched onto an already-declined household', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'DECLINED',
      allocatedSeats: 4,
      confirmedCount: 0,
      tableId: null,
    });

    await service.update('h1', { confirmedCount: 3 });

    const [[{ data }]] = prisma.household.update.mock.calls;
    expect(data.confirmedCount).toBe(0);
  });

  // null, not 0: `PENDING` with a count of 0 is indistinguishable from "nobody
  // is coming", and the dashboard's pending/declined split depends on it.
  it('resets confirmedCount to null when a household is put back to pending', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'CONFIRMED',
      allocatedSeats: 4,
      confirmedCount: 3,
      tableId: null,
    });

    await service.update('h1', { status: 'PENDING' });

    const [[{ data }]] = prisma.household.update.mock.calls;
    expect(data.confirmedCount).toBeNull();
  });
});

// TablesService.assignHousehold refuses to seat a household a table cannot
// hold, and TablesService.update refuses to shrink a table under the seats
// already taken. Editing the household was the third way into the same broken
// state: growing the party of someone already seated overflowed their table
// with nothing checking. Same maths, same 409 as the two other doors.
describe('HouseholdsService.update table capacity', () => {
  let service: HouseholdsService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
    table: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      table: { findUnique: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  function seatedAt(
    household: Record<string, unknown>,
    table: { capacity: number; households: Record<string, unknown>[] },
  ) {
    prisma.household.findUnique.mockResolvedValue({ tableId: 't1', ...household });
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Table 1',
      ...table,
    });
  }

  it('refuses to grow a seated household beyond its table capacity', async () => {
    seatedAt(
      { id: 'h1', status: 'PENDING', allocatedSeats: 4, confirmedCount: null },
      {
        capacity: 10,
        households: [
          { id: 'h1', confirmedCount: null, allocatedSeats: 4 },
          { id: 'h2', confirmedCount: 6, allocatedSeats: 6 },
        ],
      },
    );

    await expect(
      service.update('h1', { allocatedSeats: 8 }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('refuses to raise a seated household confirmedCount beyond its table capacity', async () => {
    seatedAt(
      { id: 'h1', status: 'CONFIRMED', allocatedSeats: 8, confirmedCount: 2 },
      {
        capacity: 10,
        households: [
          { id: 'h1', confirmedCount: 2, allocatedSeats: 8 },
          { id: 'h2', confirmedCount: 6, allocatedSeats: 6 },
        ],
      },
    );

    await expect(
      service.update('h1', { confirmedCount: 6 }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  // Reopening an answered household drops its count back to null, and a null
  // count means the household holds its FULL allocation again. The seats it
  // takes go up without allocatedSeats or confirmedCount ever being patched.
  it('refuses to reopen a seated household when its full allocation no longer fits', async () => {
    seatedAt(
      { id: 'h1', status: 'CONFIRMED', allocatedSeats: 8, confirmedCount: 2 },
      {
        capacity: 10,
        households: [
          { id: 'h1', confirmedCount: 2, allocatedSeats: 8 },
          { id: 'h2', confirmedCount: 6, allocatedSeats: 6 },
        ],
      },
    );

    await expect(service.update('h1', { status: 'PENDING' })).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('allows growing a seated household up to exactly the remaining seats', async () => {
    seatedAt(
      { id: 'h1', status: 'PENDING', allocatedSeats: 2, confirmedCount: null },
      {
        capacity: 10,
        households: [
          { id: 'h1', confirmedCount: null, allocatedSeats: 2 },
          { id: 'h2', confirmedCount: 6, allocatedSeats: 6 },
        ],
      },
    );

    await expect(
      service.update('h1', { allocatedSeats: 4 }),
    ).resolves.not.toThrow();
    expect(prisma.household.update).toHaveBeenCalled();
  });

  // Declining frees seats, so it must never be blocked by a table that is
  // already over capacity for some other reason.
  it('lets a seated household decline even when its table is over capacity', async () => {
    seatedAt(
      { id: 'h1', status: 'CONFIRMED', allocatedSeats: 4, confirmedCount: 4 },
      {
        capacity: 4,
        households: [
          { id: 'h1', confirmedCount: 4, allocatedSeats: 4 },
          { id: 'h2', confirmedCount: 6, allocatedSeats: 6 },
        ],
      },
    );

    await expect(
      service.update('h1', { status: 'DECLINED' }),
    ).resolves.not.toThrow();
  });

  it('does not look up a table for a household that is not seated', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      status: 'PENDING',
      allocatedSeats: 2,
      confirmedCount: null,
      tableId: null,
    });

    await expect(
      service.update('h1', { allocatedSeats: 200 }),
    ).resolves.not.toThrow();
    expect(prisma.table.findUnique).not.toHaveBeenCalled();
  });
});
