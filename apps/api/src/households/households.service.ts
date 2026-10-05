import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Household, RsvpStatus } from '@prisma/client';
import type { HouseholdSortKey, SortOrder } from '@invitation-app/shared';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { Seated, seatsFor, seatsTaken } from '../common/seating';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { compareHouseholds, matchesSearch } from './household-listing';

/** La requête une fois les défauts appliqués par `ListHouseholdsQueryDto`. */
export interface ListHouseholdsParams {
  limit: number;
  offset: number;
  q?: string;
  status?: RsvpStatus;
  sort: HouseholdSortKey;
  order: SortOrder;
}

/** Côté domaine, les foyers gardent leurs `Date` ; le contrat est fait au contrôleur. */
export interface HouseholdPage {
  items: Household[];
  total: number;
  limit: number;
  offset: number;
}

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

  /**
   * Une page de foyers. Le statut filtre en base ; la recherche et le tri se
   * font en mémoire (voir `household-listing.ts`), puis on découpe. `total`
   * compte après la recherche et avant la découpe : c'est le nombre de foyers
   * qui correspondent, pas la taille de la page.
   */
  async findAll(query: ListHouseholdsParams): Promise<HouseholdPage> {
    const households = await this.prisma.household.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: { createdAt: 'asc' },
    });

    const matching = households
      .filter((household) => matchesSearch(household, query.q ?? ''))
      .sort(compareHouseholds(query.sort, query.order));

    return {
      items: matching.slice(query.offset, query.offset + query.limit),
      total: matching.length,
      limit: query.limit,
      offset: query.offset,
    };
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

    // Mirror InvitationService.submitRsvp's invariants. Admin edits are never
    // date-restricted, but they must not be able to produce a state the public
    // path forbids — confirmedCount feeds the seating capacity maths, so an
    // over-allocation here silently corrupts the table planner.
    // Both fields can move in the same PATCH, so compare the resulting values.
    const allocatedSeats = dto.allocatedSeats ?? household.allocatedSeats;

    // Judge the count against the status the household ENDS UP in, not against
    // dto.status: a bare `{ confirmedCount: 3 }` on a declined household names
    // no status at all, yet it must not resurrect three guests.
    const status = dto.status ?? household.status;
    const confirmedCount = this.coherentConfirmedCount(
      status,
      dto.confirmedCount ?? household.confirmedCount,
    );

    // A household confirming for zero people is a decline, and it is not a
    // harmless mislabel: TablesService counts `confirmedCount ?? allocatedSeats`
    // seats, so an explicit 0 beats the `??` and the household disappears from
    // the table it is sitting at.
    if (status === 'CONFIRMED' && (confirmedCount ?? 0) < 1) {
      throw new BadRequestException(
        'confirmedCount must be at least 1 when confirming',
      );
    }
    if (confirmedCount !== null && confirmedCount > allocatedSeats) {
      throw new BadRequestException(
        'confirmedCount cannot exceed allocatedSeats',
      );
    }

    await this.assertStillFitsAtItsTable(household, {
      confirmedCount,
      allocatedSeats,
    });

    return this.prisma.household.update({
      where: { id },
      data: { ...dto, confirmedCount },
    });
  }

  /**
   * Editing a household is the third door into an over-capacity table, next to
   * assigning it there and shrinking the table under it — and it was the one
   * left unlocked. Growing the party of someone already seated overflowed
   * their table with nothing checking, so the UI showed a table holding twelve
   * guests out of ten and the two other doors could never have produced it.
   *
   * Only a growth can overflow. A decline or a shrink is left alone on
   * purpose: it frees seats, and blocking it would strand an already
   * over-capacity table in a state the admin cannot edit their way out of.
   */
  private async assertStillFitsAtItsTable(
    household: { id: string; tableId: string | null } & Seated,
    next: Seated,
  ) {
    if (!household.tableId) return;

    const seatsAfter = seatsFor(next);
    if (seatsAfter <= seatsFor(household)) return;

    const table = await this.prisma.table.findUnique({
      where: { id: household.tableId },
      include: { households: true },
    });
    if (!table) return;

    const others = seatsTaken(
      table.households.filter((h) => h.id !== household.id),
    );
    if (others + seatsAfter > table.capacity) {
      throw new ConflictException(
        `Table "${table.name}" only has ${table.capacity - others} seat(s) left, this household would need ${seatsAfter}`,
      );
    }
  }

  /**
   * DECLINED and PENDING do not take a count from the caller, they impose one.
   * Zero for a decline, so the dashboard stops summing guests nobody expects;
   * null — never 0 — for a household put back to pending, because 0 would mean
   * "answered, nobody is coming" and erase the "has not answered yet" state the
   * whole follow-up depends on.
   */
  private coherentConfirmedCount(
    status: RsvpStatus,
    requested: number | null,
  ): number | null {
    if (status === 'DECLINED') return 0;
    if (status === 'PENDING') return null;
    return requested;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.household.delete({ where: { id } });
    return { success: true };
  }
}
