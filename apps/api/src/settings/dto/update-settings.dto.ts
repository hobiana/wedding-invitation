import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

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
}
