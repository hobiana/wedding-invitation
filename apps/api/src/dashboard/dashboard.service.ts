import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsDto } from '@invitation-app/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const grouped = await this.prisma.household.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(
      grouped.map((g) => [g.status, g._count._all]),
    );

    const { _sum } = await this.prisma.household.aggregate({
      _sum: { confirmedCount: true },
    });
    const dietaryNotesCount = await this.prisma.household.count({
      where: { dietaryNotes: { not: null } },
    });

    const confirmedHouseholds = byStatus.CONFIRMED ?? 0;
    const declinedHouseholds = byStatus.DECLINED ?? 0;
    const pendingHouseholds = byStatus.PENDING ?? 0;

    return {
      totalHouseholds: confirmedHouseholds + declinedHouseholds + pendingHouseholds,
      confirmedHouseholds,
      declinedHouseholds,
      pendingHouseholds,
      totalConfirmedGuests: _sum.confirmedCount ?? 0,
      dietaryNotesCount,
    };
  }
}
