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
