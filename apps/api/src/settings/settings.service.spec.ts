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

  // Le piège du lot F. Le formulaire n'a que des `<input>` : vider « Lien vers
  // la carte » produit `""`, pas `null`. Une chaîne vide traverse le contrat
  // comme une valeur — la page invité affiche alors une ligne blanche au lieu
  // de ne rien afficher. C'est ici, avant l'écriture Prisma, que la porte se
  // ferme ; compter sur le front pour envoyer `null` reviendrait à ne garder
  // qu'un seul gardien, et il est du mauvais côté du fil.
  it('stores an emptied optional field as null rather than an empty string', async () => {
    const { service, prisma } = await createService();

    await service.update({ mapUrl: '', dressCode: '', parkingInfo: '' });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { mapUrl: null, dressCode: null, parkingInfo: null },
    });
  });

  // Un champ effacé au clavier laisse souvent une espace derrière lui. Pour
  // l'invité c'est un champ vide ; pour Prisma, sans cette normalisation,
  // c'est une valeur — et l'invitation affiche une ligne d'une espace.
  it('treats a whitespace-only optional field as emptied', async () => {
    const { service, prisma } = await createService();

    await service.update({ parkingInfo: '   ' });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { parkingInfo: null },
    });
  });

  // Le pendant : la normalisation ne touche à rien d'autre. Elle ne rogne pas
  // un texte renseigné, elle ne décide pas de ce que l'organisateur a écrit.
  it('writes a filled optional field through verbatim', async () => {
    const { service, prisma } = await createService();

    await service.update({ dressCode: 'Tenue de ville' });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { dressCode: 'Tenue de ville' },
    });
  });

  // Le seuil d'invités part tel quel : pas de `blankToNull`, ce n'est pas du
  // texte, et `null` y veut déjà dire « aucun seuil ».
  it('writes the guest threshold through as sent', async () => {
    const { service, prisma } = await createService();

    await service.update({ maxGuests: 120 });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { maxGuests: 120 },
    });
  });

  it('clears the guest threshold on an explicit null', async () => {
    const { service, prisma } = await createService();

    await service.update({ maxGuests: null });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { maxGuests: null },
    });
  });

  // Les numéros arrivent déjà normalisés par le DTO ; le service les écrit
  // tels quels, en remplaçant la liste entière (pas de fusion).
  it('writes the contact phones through as sent', async () => {
    const { service, prisma } = await createService();

    await service.update({ contactPhones: ['+261 34 64 314 02'] });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { contactPhones: ['+261 34 64 314 02'] },
    });
  });

  // Un PATCH qui ne parle pas du seuil ne doit pas l'effacer : c'est ce qui
  // permet au basculement du plan de table de ne rien toucher d'autre.
  it('leaves the guest threshold alone when the field is absent', async () => {
    const { service, prisma } = await createService();

    await service.update({ venueName: 'Espace Ny Akanintsika' });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { venueName: 'Espace Ny Akanintsika' },
    });
  });

  // `null` reçu explicitement est déjà la bonne réponse : le formulaire des
  // paramètres, une fois au contrat `string | null`, l'enverra tel quel.
  it('accepts an explicit null for an optional field', async () => {
    const { service, prisma } = await createService();

    await service.update({ mapUrl: null });

    expect(prisma.weddingSettings.update).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      data: { mapUrl: null },
    });
  });
});
