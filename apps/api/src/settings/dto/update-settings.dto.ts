import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsDateString() weddingDate?: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() address?: string;

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
}
