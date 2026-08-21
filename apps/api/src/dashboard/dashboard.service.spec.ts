import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService.getStats', () => {
  it('aggregates households by status', async () => {
    const prisma = {
      household: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'CONFIRMED', _count: { _all: 3 } },
          { status: 'DECLINED', _count: { _all: 1 } },
          { status: 'PENDING', _count: { _all: 2 } },
        ]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { confirmedCount: 7 } }),
        count: jest.fn().mockResolvedValue(2),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(DashboardService);

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
});
