import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTableDto) {
    return this.prisma.table.create({
      data: { name: dto.name, capacity: dto.capacity ?? 10 },
    });
  }

  findAll() {
    return this.prisma.table.findMany({
      include: { households: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { households: true },
    });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async update(id: string, dto: UpdateTableDto) {
    const table = await this.findOne(id);

    // assignHousehold refuses to seat more guests than a table holds, so
    // update must not be a back door into the same broken state: shrinking
    // capacity under the seats already taken leaves an over-capacity table
    // that could never have been assembled by dragging households onto it.
    if (dto.capacity !== undefined) {
      const occupied = this.seatsTaken(table.households);
      if (dto.capacity < occupied) {
        throw new ConflictException(
          `Table "${table.name}" already seats ${occupied} guest(s); its capacity cannot be lowered to ${dto.capacity}`,
        );
      }
    }

    return this.prisma.table.update({ where: { id }, data: dto });
  }

  /**
   * Seats a set of households occupies. A household that has not answered yet
   * still holds its full allocation — the same rule assignHousehold applies,
   * so both paths agree on how full a table is.
   */
  private seatsTaken(
    households: { confirmedCount: number | null; allocatedSeats: number }[],
  ) {
    return households.reduce(
      (sum, h) => sum + (h.confirmedCount ?? h.allocatedSeats),
      0,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.table.delete({ where: { id } });
    return { success: true };
  }

  async assignHousehold(tableId: string, householdId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { households: true },
    });
    if (!table) throw new NotFoundException('Table not found');

    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
    });
    if (!household) throw new NotFoundException('Household not found');

    const occupied = this.seatsTaken(
      table.households.filter((h) => h.id !== householdId),
    );
    const incoming = household.confirmedCount ?? household.allocatedSeats;

    if (occupied + incoming > table.capacity) {
      throw new ConflictException(
        `Table "${table.name}" only has ${table.capacity - occupied} seat(s) left, this household needs ${incoming}`,
      );
    }

    return this.prisma.household.update({
      where: { id: householdId },
      data: { tableId },
    });
  }

  unassignHousehold(householdId: string) {
    return this.prisma.household.update({
      where: { id: householdId },
      data: { tableId: null },
    });
  }
}
