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
});
