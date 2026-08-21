import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateArgs {
  data: {
    id: string;
    displayName: string;
    allocatedSeats: number;
    memberNames: string[];
  };
}

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let prisma: {
    household: {
      create: jest.Mock<Promise<CreateArgs['data']>, [CreateArgs]>;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        create: jest.fn<Promise<CreateArgs['data']>, [CreateArgs]>(),
        findMany: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it('generates an 8-character id and creates the household', async () => {
    prisma.household.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: data.id }),
    );
    const result = await service.create({
      displayName: 'Famille Test',
      allocatedSeats: 3,
    });
    expect(result.id).toHaveLength(8);

    const [[{ data }]] = prisma.household.create.mock.calls;
    expect(data).toEqual(
      expect.objectContaining({
        displayName: 'Famille Test',
        allocatedSeats: 3,
        memberNames: [],
      }),
    );
  });
});

describe('HouseholdsService.update', () => {
  let service: HouseholdsService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HouseholdsService);
  });

  it('throws NotFoundException for an unknown household', async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { displayName: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  // The public RSVP path (InvitationService.submitRsvp) refuses a
  // confirmedCount above allocatedSeats. The admin path fed the same seating
  // capacity maths, so it has to refuse it too.
  it('rejects a confirmedCount above the existing allocatedSeats', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
      confirmedCount: 1,
    });

    await expect(service.update('h1', { confirmedCount: 5 })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('rejects shrinking allocatedSeats below the already-confirmed count', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 6,
      confirmedCount: 5,
    });

    await expect(service.update('h1', { allocatedSeats: 3 })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.household.update).not.toHaveBeenCalled();
  });

  it('accepts a confirmedCount raised together with allocatedSeats in one patch', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
      confirmedCount: 2,
    });

    await expect(
      service.update('h1', { allocatedSeats: 6, confirmedCount: 5 }),
    ).resolves.not.toThrow();
    expect(prisma.household.update).toHaveBeenCalledWith({
      where: { id: 'h1' },
      data: { allocatedSeats: 6, confirmedCount: 5 },
    });
  });

  it('allows a confirmedCount equal to allocatedSeats', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 4,
      confirmedCount: null,
    });

    await expect(
      service.update('h1', { confirmedCount: 4 }),
    ).resolves.not.toThrow();
  });

  it('leaves a household with no confirmedCount alone when patching other fields', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 4,
      confirmedCount: null,
    });

    await expect(
      service.update('h1', { displayName: 'Famille Renommée' }),
    ).resolves.not.toThrow();
  });
});
