import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettingsService.update', () => {
  async function createService(update = jest.fn().mockResolvedValue({})) {
    const prisma = { weddingSettings: { update } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    return { service: moduleRef.get(SettingsService), prisma };
  }

  it('updates the singleton settings row by id', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'singleton', seatingPlanActivated: true });
    const { service, prisma } = await createService(update);

    await service.update({ seatingPlanActivated: true });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'singleton' } }),
    );
  });

  it('activates the seating plan alone without touching other fields (no accidental nulling)', async () => {
    const { service, prisma } = await createService();

    await service.update({ seatingPlanActivated: true });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { seatingPlanActivated: true },
    });
  });

  it('converts date-string fields to Date objects before hitting Prisma', async () => {
    const { service, prisma } = await createService();

    await service.update({
      weddingDate: '2027-06-12T14:00:00.000Z',
      rsvpDeadline: '2027-05-01T00:00:00.000Z',
    });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: {
        weddingDate: new Date('2027-06-12T14:00:00.000Z'),
        rsvpDeadline: new Date('2027-05-01T00:00:00.000Z'),
      },
    });
  });
});
