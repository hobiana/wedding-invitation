import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  HouseholdPublicDto,
  InvitationResponseDto,
  SeatingPlanDto,
} from '@invitation-app/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toHouseholdPublicDto, toWeddingInfoDto } from '../common/contract';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvitation(linkId: string): Promise<InvitationResponseDto> {
    const household = await this.prisma.household.findUnique({
      where: { id: linkId },
    });
    if (!household) throw new NotFoundException('Invitation not found');

    const wedding = await this.prisma.weddingSettings.findUniqueOrThrow({
      where: { id: 'singleton' },
    });

    // `confirmedCount` reste nullable jusqu'ici : `null` = « ce foyer n'a pas
    // encore répondu », `0` = « il a répondu que personne ne vient ». Typer ce
    // champ `number` rendrait un `?? 0` structurellement obligatoire et
    // écraserait la distinction avant même qu'elle quitte l'API.
    //
    // Le type vient maintenant du contrat partagé : la forme n'est plus
    // décrite deux fois, et le front ne peut plus s'en écarter tout seul.
    let seatingPlan: SeatingPlanDto | null = null;
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
              confirmedCount: h.confirmedCount,
            })),
        };
      }
    }

    return {
      household: toHouseholdPublicDto(household),
      wedding: toWeddingInfoDto(wedding),
      seatingPlan,
    };
  }

  async submitRsvp(
    linkId: string,
    dto: SubmitRsvpDto,
  ): Promise<HouseholdPublicDto> {
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

    const updated = await this.prisma.household.update({
      where: { id: linkId },
      data: {
        status: dto.status,
        confirmedCount: dto.status === 'DECLINED' ? 0 : dto.confirmedCount,
        memberNames: dto.memberNames ?? household.memberNames,
        dietaryNotes: dto.dietaryNotes,
        message: dto.message,
      },
    });
    return toHouseholdPublicDto(updated);
  }
}
