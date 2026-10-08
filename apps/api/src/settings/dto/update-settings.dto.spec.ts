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

  // Les numéros des mariés, publiés sur la page invité. Une liste jamais
  // vide : l'invitation dit « appelez-nous en cas de changement », elle doit
  // toujours avoir quelqu'un à appeler. Le format reste large (chaque pays
  // écrit ses numéros à sa façon) mais refuse ce qui n'est pas un numéro —
  // la chaîne finit dans un lien `tel:` sur une page publique.
  describe('contactPhones', () => {
    it('accepts one to five well-formed numbers, as typed', async () => {
      const phones = [
        '+261 34 64 314 02',
        '034 29 682 30',
        '+33 (0)6 12-34-56-78',
        '06.12.34.56.79',
        '+1 555 0100 123',
      ];
      await expect(
        pipe.transform({ contactPhones: phones }, body),
      ).resolves.toEqual({ contactPhones: phones });
    });

    it('trims each number and collapses inner runs of spaces', async () => {
      await expect(
        pipe.transform({ contactPhones: ['  +261  34 64   314 02 '] }, body),
      ).resolves.toEqual({ contactPhones: ['+261 34 64 314 02'] });
    });

    // Absent = ne pas toucher : c'est ce qui laisse basculer le plan de table
    // sans renvoyer les numéros.
    it('leaves the field out when it is not sent', async () => {
      await expect(
        pipe.transform({ seatingPlanActivated: true }, body),
      ).resolves.toEqual({ seatingPlanActivated: true });
    });

    // Contrairement aux champs texte facultatifs, `null` n'a pas de sens
    // ici : le contrat promet au moins un numéro.
    it.each([
      ['null', null],
      ['an empty list', []],
      [
        'six numbers',
        Array.from({ length: 6 }, (_, i) => `+261 34 00 000 0${i}`),
      ],
      ['a bare string', '+261 34 64 314 02'],
    ])('refuses %s', async (_label, value) => {
      await expect(
        pipe.transform({ contactPhones: value }, body),
      ).rejects.toThrow();
    });

    it.each([
      ['an empty string', ''],
      ['a blank string', '   '],
      ['letters', 'abc'],
      ['a script URL', 'javascript:alert(1)'],
      ['markup', '<script>'],
      ['a country code alone', '+261'],
      ['a plus sign in the middle', '034 + 29 682 30'],
      [
        'a number longer than 30 characters',
        '+261 34 64 314 02 34 64 314 02 99',
      ],
      ['a non-string', 261346431402],
    ])('refuses %s among the numbers', async (_label, value) => {
      await expect(
        pipe.transform({ contactPhones: ['+261 34 64 314 02', value] }, body),
      ).rejects.toThrow();
    });

    // Le doublon est jugé après normalisation : deux saisies qui ne diffèrent
    // que par les espaces sont le même numéro affiché deux fois.
    it('refuses the same number twice, even spaced differently', async () => {
      await expect(
        pipe.transform(
          { contactPhones: ['+261 34 64 314 02', ' +261  34 64 314 02'] },
          body,
        ),
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
