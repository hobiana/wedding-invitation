import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.weddingSettings.findUniqueOrThrow({
      where: { id: 'singleton' },
    });
  }

  update(dto: UpdateSettingsDto) {
    const {
      weddingDate,
      rsvpDeadline,
      mapUrl,
      dressCode,
      parkingInfo,
      ...rest
    } = dto;
    const data = {
      ...rest,
      ...(weddingDate !== undefined && { weddingDate: new Date(weddingDate) }),
      ...(rsvpDeadline !== undefined && {
        rsvpDeadline: new Date(rsvpDeadline),
      }),
      // Chaque champ n'entre dans `data` que s'il a été envoyé : Prisma
      // n'écrit pas les clés absentes, et c'est ce qui permet de basculer le
      // plan de table sans effacer le reste au passage.
      ...(mapUrl !== undefined && { mapUrl: blankToNull(mapUrl) }),
      ...(dressCode !== undefined && { dressCode: blankToNull(dressCode) }),
      ...(parkingInfo !== undefined && {
        parkingInfo: blankToNull(parkingInfo),
      }),
    };
    return this.prisma.weddingSettings.update({
      where: { id: 'singleton' },
      data,
    });
  }
}

/**
 * Un champ facultatif vidé vaut `null`, jamais `""`.
 *
 * Le formulaire des paramètres n'a que des `<input>` : effacer « Lien vers la
 * carte » y produit une chaîne vide, parfois une espace oubliée. Écrite telle
 * quelle, elle traverse le contrat comme une valeur — `mapUrl` cesse d'être
 * `null` sans pour autant dire quoi que ce soit, et la page invité affiche une
 * ligne blanche au lieu de ne rien afficher. Même classe de bug que le `0`
 * écrit à la place du `null` de `confirmedCount`.
 *
 * La porte se ferme ici, avant Prisma, et pas seulement dans le formulaire :
 * un `curl` bien tourné passe à côté du front.
 *
 * Un texte renseigné part verbatim — la normalisation constate qu'un champ est
 * vide, elle ne réécrit pas ce que l'organisateur a saisi.
 */
function blankToNull(value: string | null): string | null {
  return value === null || value.trim() === '' ? null : value;
}
