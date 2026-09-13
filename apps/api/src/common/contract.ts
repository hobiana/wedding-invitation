import type { Household, Table, WeddingSettings } from '@prisma/client';
import type {
  AdminSettingsDto,
  HouseholdAdminDto,
  HouseholdPublicDto,
  TableDto,
  WeddingInfoDto,
} from '@invitation-app/shared';

/**
 * La traduction d'une ligne Prisma vers le contrat de `@invitation-app/shared`,
 * en un seul endroit — comme `seating.ts` pour l'occupation d'une table.
 *
 * Deux choses se jouent ici, et aucune des deux ne se voit à l'exécution :
 *
 * 1. **Le compilateur confronte enfin les deux bouts.** Entrée typée Prisma,
 *    sortie typée contrat : un champ dont la nullabilité change en base, ou un
 *    champ ajouté au DTO, casse le build ici plutôt que dans le navigateur
 *    d'un invité. C'est par ce trou que `confirmedCount` est passé trois fois.
 *
 * 2. **Ce qui part sur le fil est énuméré à la main.** Une annotation de type
 *    seule ne retire rien : TypeScript accepte l'objet Prisma entier là où il
 *    attend le DTO, puisqu'il a bien tous les champs demandés — et les colonnes
 *    en trop partent quand même. La prochaine colonne ajoutée au schéma serait
 *    publiée sans que personne l'ait décidé.
 *
 * Les dates deviennent des chaînes ISO. Le contrat annonce `string`, Prisma
 * rend `Date`, et `JSON.stringify` masquait l'écart : identique sur le fil,
 * invisible au typage, faux dès qu'un test appelle le service en direct.
 */
export function toHouseholdPublicDto(household: Household): HouseholdPublicDto {
  return {
    id: household.id,
    displayName: household.displayName,
    allocatedSeats: household.allocatedSeats,
    memberNames: household.memberNames,
    status: household.status,
    confirmedCount: household.confirmedCount,
    dietaryNotes: household.dietaryNotes,
    message: household.message,
  };
}

/**
 * Le foyer tel que l'admin le voit : le contrat public plus la place à table
 * et les horodatages. La correspondance avec la ligne Prisma est exacte,
 * colonne pour colonne — rien n'est masqué à l'organisateur, contrairement à
 * la vue invité.
 */
export function toHouseholdAdminDto(household: Household): HouseholdAdminDto {
  return {
    ...toHouseholdPublicDto(household),
    tableId: household.tableId,
    createdAt: household.createdAt.toISOString(),
    updatedAt: household.updatedAt.toISOString(),
  };
}

/**
 * Une table et ce qu'il faut savoir des foyers qui y sont assis : de quoi
 * calculer l'occupation (`seatsFor`) et poser une étiquette, rien de plus.
 * Le reste de la fiche du foyer se demande à `/admin/households`.
 */
export function toTableDto(
  table: Table & { households: Household[] },
): TableDto {
  return {
    id: table.id,
    name: table.name,
    capacity: table.capacity,
    households: table.households.map((household) => ({
      id: household.id,
      displayName: household.displayName,
      allocatedSeats: household.allocatedSeats,
      confirmedCount: household.confirmedCount,
      status: household.status,
    })),
  };
}

/**
 * `seatingPlanActivated` et l'`id` « singleton » restent ici : ce sont des
 * réglages d'organisation, l'invité n'en a pas l'usage. Le plan de table lui
 * parvient déjà composé, ou pas du tout.
 */
export function toWeddingInfoDto(wedding: WeddingSettings): WeddingInfoDto {
  return {
    weddingDate: wedding.weddingDate.toISOString(),
    venueName: wedding.venueName,
    address: wedding.address,
    mapUrl: wedding.mapUrl,
    dressCode: wedding.dressCode,
    parkingInfo: wedding.parkingInfo,
    rsvpDeadline: wedding.rsvpDeadline.toISOString(),
  };
}

/**
 * Les mêmes réglages vus de l'organisateur : le contrat invité, plus le
 * basculement du plan de table — qui n'a de sens que pour lui.
 *
 * L'`id` « singleton » ne part pas. C'est une commodité de schéma pour tenir
 * la table à une seule ligne, pas une information : le renvoyer faisait
 * recharger cet `id` dans l'état du formulaire des paramètres, qui le
 * repostait ensuite dans son PATCH. Le `whitelist` du `ValidationPipe` le
 * jetait en silence — ce qui tient tant que personne n'active
 * `forbidNonWhitelisted`.
 *
 * Les trois champs facultatifs sortent en `string | null`, comme les colonnes
 * et comme `toWeddingInfoDto`. C'est le dernier endroit où le compilateur
 * peut constater qu'un `null` de base reste un `null` de contrat : passé le
 * DTO, le front n'a plus aucun moyen de rattraper la distinction entre
 * « champ non renseigné » et « champ absent ».
 */
export function toAdminSettingsDto(wedding: WeddingSettings): AdminSettingsDto {
  return {
    ...toWeddingInfoDto(wedding),
    seatingPlanActivated: wedding.seatingPlanActivated,
  };
}
