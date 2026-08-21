import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../prisma/prisma.service';

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
