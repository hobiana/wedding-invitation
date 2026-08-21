import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InvitationService.getInvitation', () => {
  let service: InvitationService;
  let prisma: {
    household: { findUnique: jest.Mock };
    weddingSettings: { findUniqueOrThrow: jest.Mock };
    table: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: { findUnique: jest.fn() },
      weddingSettings: { findUniqueOrThrow: jest.fn() },
      table: { findUnique: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(InvitationService);
  });

  it('throws NotFoundException for an unknown linkId', async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(service.getInvitation('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });

  // The seating plan is revealed manually by the admin and never by date, so
  // an assigned table must stay invisible until the toggle is flipped.
  it('hides the seating plan while seatingPlanActivated is false, even for a seated household', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      displayName: 'Famille A',
      tableId: 't1',
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      seatingPlanActivated: false,
    });

    const result = await service.getInvitation('h1');

    expect(result.seatingPlan).toBeNull();
    expect(prisma.table.findUnique).not.toHaveBeenCalled();
  });

  it('returns no seating plan for a household that has not been seated yet', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      displayName: 'Famille A',
      tableId: null,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      seatingPlanActivated: true,
    });

    const result = await service.getInvitation('h1');

    expect(result.seatingPlan).toBeNull();
    expect(prisma.table.findUnique).not.toHaveBeenCalled();
  });

  it('returns the table name and neighbours, excluding the household itself', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      displayName: 'Famille A',
      tableId: 't1',
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      seatingPlanActivated: true,
    });
    prisma.table.findUnique.mockResolvedValue({
      id: 't1',
      name: "Table d'honneur",
      households: [
        { id: 'h1', displayName: 'Famille A', confirmedCount: 2 },
        { id: 'h2', displayName: 'Famille B', confirmedCount: 3 },
        { id: 'h3', displayName: 'Famille C', confirmedCount: null },
      ],
    });

    const result = await service.getInvitation('h1');

    expect(result.seatingPlan).toEqual({
      tableName: "Table d'honneur",
      neighbors: [
        { displayName: 'Famille B', confirmedCount: 3 },
        // a neighbour who has not answered yet reads as 0, never null
        { displayName: 'Famille C', confirmedCount: 0 },
      ],
    });
    expect(
      result.seatingPlan?.neighbors.map((n) => n.displayName),
    ).not.toContain('Famille A');
  });

  it('returns the household and wedding settings alongside the plan', async () => {
    const household = { id: 'h1', displayName: 'Famille A', tableId: null };
    const wedding = {
      seatingPlanActivated: false,
      venueName: 'Domaine des Roses',
    };
    prisma.household.findUnique.mockResolvedValue(household);
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue(wedding);

    await expect(service.getInvitation('h1')).resolves.toEqual({
      household,
      wedding,
      seatingPlan: null,
    });
  });
});

describe('InvitationService.submitRsvp', () => {
  let service: InvitationService;
  let prisma: {
    household: { findUnique: jest.Mock; update: jest.Mock };
    weddingSettings: { findUniqueOrThrow: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      household: { findUnique: jest.fn(), update: jest.fn() },
      weddingSettings: { findUniqueOrThrow: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(InvitationService);
  });

  it('throws NotFoundException for an unknown linkId', async () => {
    prisma.household.findUnique.mockResolvedValue(null);
    await expect(
      service.submitRsvp('unknown', { status: 'CONFIRMED', confirmedCount: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException after the RSVP deadline', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 4,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      rsvpDeadline: new Date('2020-01-01'),
    });
    await expect(
      service.submitRsvp('h1', { status: 'CONFIRMED', confirmedCount: 2 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when confirmedCount exceeds allocatedSeats', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      rsvpDeadline: new Date('2999-01-01'),
    });
    await expect(
      service.submitRsvp('h1', { status: 'CONFIRMED', confirmedCount: 5 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets confirmedCount to 0 when declining', async () => {
    prisma.household.findUnique.mockResolvedValue({
      id: 'h1',
      allocatedSeats: 2,
    });
    prisma.weddingSettings.findUniqueOrThrow.mockResolvedValue({
      rsvpDeadline: new Date('2999-01-01'),
    });
    prisma.household.update.mockResolvedValue({
      id: 'h1',
      status: 'DECLINED',
      confirmedCount: 0,
    });
    await service.submitRsvp('h1', { status: 'DECLINED' });

    const [[updateArgs]] = prisma.household.update.mock.calls as [
      [
        {
          where: { id: string };
          data: { status: string; confirmedCount: number };
        },
      ],
    ];
    expect(updateArgs.where).toEqual({ id: 'h1' });
    expect(updateArgs.data).toEqual(
      expect.objectContaining({ status: 'DECLINED', confirmedCount: 0 }),
    );
  });
});
