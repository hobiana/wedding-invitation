import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

async function createService(count = jest.fn().mockResolvedValue(2)) {
  const prisma = {
    household: {
      groupBy: jest.fn().mockResolvedValue([
        { status: 'CONFIRMED', _count: { _all: 3 } },
        { status: 'DECLINED', _count: { _all: 1 } },
        { status: 'PENDING', _count: { _all: 2 } },
      ]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { confirmedCount: 7 } }),
      count,
    },
  };
  const moduleRef = await Test.createTestingModule({
    providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return { service: moduleRef.get(DashboardService), prisma };
}

describe('DashboardService.getStats', () => {
  it('aggregates households by status', async () => {
    const { service } = await createService();

    const stats = await service.getStats();

    expect(stats).toEqual({
      totalHouseholds: 6,
      confirmedHouseholds: 3,
      declinedHouseholds: 1,
      pendingHouseholds: 2,
      totalConfirmedGuests: 7,
      dietaryNotesCount: 2,
    });
  });

  // `dietaryNotes: { not: null }` also matched the empty strings the RSVP form
  // used to write for every untouched textarea, so every confirming guest was
  // counted as having dietary requirements. Rows written before that fix are
  // still in the database, so the query has to exclude '' as well.
  it('counts only households with a non-empty dietary note', async () => {
    const { service, prisma } = await createService(
      jest.fn().mockResolvedValue(0),
    );

    await service.getStats();

    expect(prisma.household.count).toHaveBeenCalledWith({
      where: { NOT: [{ dietaryNotes: null }, { dietaryNotes: '' }] },
    });
  });
});
