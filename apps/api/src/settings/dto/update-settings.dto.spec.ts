import { ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import { UpdateSettingsDto } from './update-settings.dto';

// Les mêmes options que `configureApp` pose globalement (`common/configure-app.ts`) :
// un DTO qui valide « en principe » mais que le pipe réel refuse ne prouve rien.
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const body: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateSettingsDto,
  data: '',
};

describe('UpdateSettingsDto', () => {
  // Le formulaire des paramètres enverra `null` pour un champ vidé, une fois
  // passé au contrat `string | null`. Si la validation le refusait, le lot F
  // rendrait les paramètres inenregistrables — et l'erreur arriverait en 400,
  // loin d'ici.
  it('accepts an explicit null for the three optional text fields', async () => {
    await expect(
      pipe.transform(
        { mapUrl: null, dressCode: null, parkingInfo: null },
        body,
      ),
    ).resolves.toEqual({ mapUrl: null, dressCode: null, parkingInfo: null });
  });

  // `whitelist: true` ne garde que les propriétés décorées : la normalisation
  // du service ne verrait jamais un champ que le pipe aurait jeté en route.
  it('keeps an emptied optional field for the service to normalise', async () => {
    await expect(pipe.transform({ mapUrl: '' }, body)).resolves.toEqual({
      mapUrl: '',
    });
  });

  it('rejects a non-string where the contract promises text', async () => {
    await expect(pipe.transform({ dressCode: 42 }, body)).rejects.toThrow();
  });

  // Le seuil d'invités : un nombre de personnes, donc un entier strictement
  // positif. Le plafond refuse les fautes de frappe (18000 pour 180) avant
  // qu'elles n'aplatissent la barre du tableau de bord.
  describe('maxGuests', () => {
    it.each([1, 180, 10000])('accepts the whole number %d', async (value) => {
      await expect(pipe.transform({ maxGuests: value }, body)).resolves.toEqual(
        { maxGuests: value },
      );
    });

    // `null` explicite = « aucun seuil ». C'est ce que le formulaire enverra
    // pour un champ vidé ; le refuser rendrait le seuil impossible à retirer.
    it('accepts an explicit null to clear the threshold', async () => {
      await expect(pipe.transform({ maxGuests: null }, body)).resolves.toEqual({
        maxGuests: null,
      });
    });

    it.each([0, -5, 1.5, 10001, '180', true])('refuses %p', async (value) => {
      await expect(
        pipe.transform({ maxGuests: value }, body),
      ).rejects.toThrow();
    });
  });

  // Colonnes non nullables : un lieu vidé par mégarde s'afficherait comme un
  // blanc sur l'invitation. Le correctif est un refus, pas un null.
  it.each(['venueName', 'address'])(
    'refuses an empty or blank %s',
    async (field) => {
      await expect(pipe.transform({ [field]: '' }, body)).rejects.toThrow();
      await expect(pipe.transform({ [field]: '   ' }, body)).rejects.toThrow();
      await expect(
        pipe.transform({ [field]: 'Domaine des Roses' }, body),
      ).resolves.toEqual({ [field]: 'Domaine des Roses' });
    },
  );
});
