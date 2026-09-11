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

    const updated = await this.prisma.household.update({
      where: { id: linkId },
      data: {
        status: dto.status,
        // Confirmer veut dire « nous venons tous » (décision du commanditaire,
        // 2026-09-10) : le nombre est celui des places que l'organisateur a
        // lui-même accordées, et **c'est le serveur qui le pose**. L'invité ne
        // l'envoie pas, donc il ne peut pas l'inventer — ni par mégarde, ni
        // avec un corps de requête fabriqué à la main.
        //
        // Un foyer qui vient en partie se corrige depuis l'admin ; l'invitation
        // demande d'appeler en cas de changement. L'invariant, lui, ne bouge
        // pas : `null` tant que le foyer n'a pas répondu, `0` s'il décline.
        confirmedCount:
          dto.status === 'DECLINED' ? 0 : household.allocatedSeats,
        memberNames: dto.memberNames ?? household.memberNames,
        dietaryNotes: dto.dietaryNotes,
        message: dto.message,
      },
    });
    return toHouseholdPublicDto(updated);
  }
}
