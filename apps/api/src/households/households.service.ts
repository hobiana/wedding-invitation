import { Injectable, NotFoundException } from '@nestjs/common';
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
    await this.findOne(id);
    return this.prisma.household.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.household.delete({ where: { id } });
    return { success: true };
  }
}
