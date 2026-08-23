import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
