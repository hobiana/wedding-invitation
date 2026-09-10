import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TablesService } from './tables.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TablesService.assignHousehold', () => {
  let service: TablesService;
  let prisma: {
    table: { findUnique: jest.Mock };
    household: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      table: { findUnique: jest.fn() },
      household: { findUnique: jest.fn(), update: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [TablesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TablesService);
  });

  it('throws NotFoundException for an unknown table', async () => {
    prisma.table.findUnique.mockResolvedValue(null);
    await expect(service.assignHousehold('t1', 'h1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException when the household would overflow capacity', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      capacity: 10,
      households: [{ id: 'existing', confirmedCount: 8, allocatedSeats: 8 }],
    });
    prisma.household.findUnique.mockResolvedValue({
      id: 'h2',
      confirmedCount: 4,
      allocatedSeats: 4,
      tableId: null,
    });

    await expect(service.assignHousehold('t1', 'h2')).rejects.toThrow(
      ConflictException,
    );
  });

  it('assigns the household when capacity allows it', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      capacity: 10,
      households: [{ id: 'existing', confirmedCount: 4, allocatedSeats: 4 }],
    });
    prisma.household.findUnique.mockResolvedValue({
      id: 'h2',
      confirmedCount: 3,
      allocatedSeats: 3,
      tableId: null,
    });
    prisma.household.update.mockResolvedValue({ id: 'h2', tableId: 't1' });

    await service.assignHousehold('t1', 'h2');
    expect(prisma.household.update).toHaveBeenCalledWith({
      where: { id: 'h2' },
      data: { tableId: 't1' },
    });
  });

  it("excludes the household's own current seats when re-assigning to the same table", async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      capacity: 10,
      households: [{ id: 'h2', confirmedCount: 10, allocatedSeats: 10 }],
    });
    prisma.household.findUnique.mockResolvedValue({
      id: 'h2',
      confirmedCount: 10,
      allocatedSeats: 10,
      tableId: 't1',
    });
    prisma.household.update.mockResolvedValue({ id: 'h2', tableId: 't1' });

    await expect(service.assignHousehold('t1', 'h2')).resolves.not.toThrow();
  });
});

describe('TablesService.create', () => {
  let service: TablesService;
  let prisma: { table: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = { table: { create: jest.fn().mockResolvedValue({}) } };
    const moduleRef = await Test.createTestingModule({
      providers: [TablesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TablesService);
  });

  // `TableDto` porte ses foyers : c'est la même forme aux quatre routes de
  // `/admin/tables`, sinon le front reçoit tantôt une table, tantôt une
  // demi-table sous le même type. Sans `include`, Prisma ne rend que la ligne.
  it('asks Prisma for the households so a created table is a whole table', async () => {
    await service.create({ name: 'Table 7' });

    expect(prisma.table.create).toHaveBeenCalledWith({
      data: { name: 'Table 7', capacity: 10 },
      include: { households: true },
    });
  });
});

describe('TablesService.update', () => {
  let service: TablesService;
  let prisma: {
    table: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      table: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [TablesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TablesService);
  });

  it('throws NotFoundException for an unknown table', async () => {
    prisma.table.findUnique.mockResolvedValue(null);
    await expect(service.update('t1', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  // assignHousehold would have refused to create this state, so update must
  // not be a back door into it: shrinking capacity under the seats already
  // taken leaves an over-capacity table the assign path can never produce.
  it('refuses to shrink capacity below the seats already taken', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Table 1',
      capacity: 10,
      households: [
        { id: 'h1', confirmedCount: 4, allocatedSeats: 4 },
        { id: 'h2', confirmedCount: null, allocatedSeats: 3 },
      ],
    });

    await expect(service.update('t1', { capacity: 6 })).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.table.update).not.toHaveBeenCalled();
  });

  it('allows shrinking capacity down to exactly the seats taken', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Table 1',
      capacity: 10,
      households: [{ id: 'h1', confirmedCount: 7, allocatedSeats: 8 }],
    });

    await expect(service.update('t1', { capacity: 7 })).resolves.not.toThrow();
    expect(prisma.table.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { capacity: 7 },
      include: { households: true },
    });
  });

  it('allows a rename with no capacity change on an over-subscribed table', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Table 1',
      capacity: 4,
      households: [{ id: 'h1', confirmedCount: 9, allocatedSeats: 9 }],
    });

    await expect(
      service.update('t1', { name: 'Table des amis' }),
    ).resolves.not.toThrow();
  });
});
