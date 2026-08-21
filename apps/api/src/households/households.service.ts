import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateHouseholdDto) {
    return this.prisma.household.create({
      data: {
        id: nanoid(8),
        displayName: dto.displayName,
        allocatedSeats: dto.allocatedSeats,
        memberNames: dto.memberNames ?? [],
      },
    });
  }

  findAll() {
    return this.prisma.household.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const household = await this.prisma.household.findUnique({
      where: { id },
    });
    if (!household) throw new NotFoundException('Household not found');
    return household;
  }

  async update(id: string, dto: UpdateHouseholdDto) {
    const household = await this.findOne(id);

    // Mirror InvitationService.submitRsvp's invariant. Admin edits are never
    // date-restricted, but they must not be able to produce a state the public
    // path forbids — confirmedCount feeds the seating capacity maths, so an
    // over-allocation here silently corrupts the table planner.
    // Both fields can move in the same PATCH, so compare the resulting values.
    const allocatedSeats = dto.allocatedSeats ?? household.allocatedSeats;
    const confirmedCount = dto.confirmedCount ?? household.confirmedCount;
    if (confirmedCount !== null && confirmedCount > allocatedSeats) {
      throw new BadRequestException(
        'confirmedCount cannot exceed allocatedSeats',
      );
    }

    return this.prisma.household.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.household.delete({ where: { id } });
    return { success: true };
  }
}
