import { Test } from '@nestjs/testing';
import type { WeddingSettings } from '@prisma/client';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const row: WeddingSettings = {
  id: 'singleton',
  weddingDate: new Date('2027-01-02T11:00:00.000Z'),
  venueName: 'Jardin d’Antananarivo',
  address: 'Lot II, Antananarivo',
  mapUrl: null,
  dressCode: null,
  parkingInfo: null,
  rsvpDeadline: new Date('2026-11-30T23:00:00.000Z'),
  seatingPlanActivated: false,
};

const contract = {
  weddingDate: '2027-01-02T11:00:00.000Z',
  venueName: 'Jardin d’Antananarivo',
  address: 'Lot II, Antananarivo',
  mapUrl: null,
  dressCode: null,
  parkingInfo: null,
  rsvpDeadline: '2026-11-30T23:00:00.000Z',
  seatingPlanActivated: false,
};

async function createController() {
  const service = {
    get: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue(row),
  };
  const moduleRef = await Test.createTestingModule({
    controllers: [SettingsController],
    providers: [{ provide: SettingsService, useValue: service }],
  }).compile();
  return { controller: moduleRef.get(SettingsController), service };
}

/**
 * La traduction se fait dans le contrôleur, comme pour les foyers et les
 * tables : le service garde ses `Date` pour la logique, le fil reçoit de
 * l'ISO. Sans elle, `JSON.stringify` masquait l'écart — identique sur le fil,
 * faux dès qu'un test appelle la méthode en direct — et l'`id` « singleton »
 * partait avec, alors qu'il n'est au contrat d'aucun des deux publics.
 */
describe('SettingsController', () => {
  it('answers the settings contract rather than the Prisma row', async () => {
    const { controller } = await createController();

    await expect(controller.get()).resolves.toEqual(contract);
  });

  it('answers that same contract after an update', async () => {
    const { controller, service } = await createController();

    await expect(controller.update({ mapUrl: null })).resolves.toEqual(
      contract,
    );
    expect(service.update).toHaveBeenCalledWith({ mapUrl: null });
  });
});
