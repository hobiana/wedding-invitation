import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Un numéro tel qu'on l'écrit : un « + » facultatif en tête, puis chiffres,
 * espaces, tirets, points et parenthèses — et au moins sept chiffres, ce qui
 * écarte un indicatif seul (« +261 »). Volontairement large : chaque pays a
 * sa façon de grouper. Ce qui compte est ce qui est refusé, puisque la chaîne
 * finit dans un lien `tel:` d'une page publique : lettres, deux-points,
 * chevrons.
 */
const PHONE = /^(?=(?:\D*\d){7})\+?[\d .()-]+$/;

/** Rogne les bords et réduit les espaces multiples ; le reste passe tel quel. */
function normalisePhones(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((phone: unknown) =>
    typeof phone === 'string' ? phone.trim().replace(/\s+/g, ' ') : phone,
  );
}

export class UpdateSettingsDto {
  @IsOptional() @IsDateString() weddingDate?: string;
  @IsOptional() @IsString() @Matches(/\S/, { message: 'venueName must not be blank' }) venueName?: string;
  @IsOptional() @IsString() @Matches(/\S/, { message: 'address must not be blank' }) address?: string;

  /**
   * `string | null` et non `string` : ces trois colonnes sont nullables, et
   * `null` est la façon dont le formulaire dit « ce champ est vide ».
   * `@IsOptional()` laisse passer aussi bien `null` que l'absence du champ —
   * les deux sont légitimes ici, et le service les distingue : un champ absent
   * n'est pas écrit, un champ `null` (ou vidé à `""`) l'est comme `null`.
   */
  @IsOptional() @IsString() mapUrl?: string | null;
  @IsOptional() @IsString() dressCode?: string | null;
  @IsOptional() @IsString() parkingInfo?: string | null;

  @IsOptional() @IsDateString() rsvpDeadline?: string;
  @IsOptional() @IsBoolean() seatingPlanActivated?: boolean;

  /**
   * Seuil d'invités. Même règle que les champs texte facultatifs : absent =
   * ne pas toucher, `null` = « aucun seuil » (`@IsOptional()` laisse passer
   * les deux, sans exécuter les validations suivantes). Sinon un entier
   * de 1 à 10 000 — le plafond refuse les fautes de frappe, pas un vrai seuil.
   */
  @IsOptional() @IsInt() @Min(1) @Max(10000) maxGuests?: number | null;

  /**
   * Les numéros des mariés, affichés sur la page invité. Absent = ne pas
   * toucher. Mais **ni `null` ni `[]`** : l'invitation dit « appelez-nous en
   * cas de changement », elle doit toujours avoir un numéro à donner. D'où
   * `@ValidateIf` au lieu de `@IsOptional()`, qui laisserait passer `null`.
   *
   * La normalisation (`@Transform`) court avant la validation : le doublon est
   * jugé sur le numéro rogné, et le service reçoit déjà la forme à écrire.
   */
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => normalisePhones(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  @Matches(PHONE, {
    each: true,
    message: 'each contactPhones entry must be a phone number',
  })
  contactPhones?: string[];
}
