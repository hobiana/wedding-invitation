import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvitation(linkId: string) {
    const household = await this.prisma.household.findUnique({
      where: { id: linkId },
    });
    if (!household) throw new NotFoundException('Invitation not found');

    const wedding = await this.prisma.weddingSettings.findUniqueOrThrow({
      where: { id: 'singleton' },
    });

    let seatingPlan: {
      tableName: string;
      neighbors: { displayName: string; confirmedCount: number }[];
    } | null = null;
    if (wedding.seatingPlanActivated && household.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: household.tableId },
        include: { households: true },
      });
      if (table) {
        seatingPlan = {
          tableName: table.name,
          neighbors: table.households
            .filter((h) => h.id !== household.id)
            .map((h) => ({
              displayName: h.displayName,
              confirmedCount: h.confirmedCount ?? 0,
            })),
        };
      }
    }

    return { household, wedding, seatingPlan };
  }

  async submitRsvp(linkId: string, dto: SubmitRsvpDto) {
    const household = await this.prisma.household.findUnique({
      where: { id: linkId },
    });
    if (!household) throw new NotFoundException('Invitation not found');

    const wedding = await this.prisma.weddingSettings.findUniqueOrThrow({
      where: { id: 'singleton' },
    });
    if (new Date() > wedding.rsvpDeadline) {
      throw new ForbiddenException('RSVP deadline has passed');
    }

    if (dto.status === 'CONFIRMED') {
      if (dto.confirmedCount === undefined || dto.confirmedCount < 1) {
        throw new BadRequestException(
          'confirmedCount must be at least 1 when confirming',
        );
      }
      if (dto.confirmedCount > household.allocatedSeats) {
        throw new BadRequestException(
          'confirmedCount cannot exceed allocatedSeats',
        );
      }
    }

    return this.prisma.household.update({
      where: { id: linkId },
      data: {
        status: dto.status,
        confirmedCount: dto.status === 'DECLINED' ? 0 : dto.confirmedCount,
        memberNames: dto.memberNames ?? household.memberNames,
        dietaryNotes: dto.dietaryNotes,
        message: dto.message,
      },
    });
  }
}
