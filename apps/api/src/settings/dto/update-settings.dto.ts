import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsDateString() weddingDate?: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() mapUrl?: string;
  @IsOptional() @IsString() dressCode?: string;
  @IsOptional() @IsString() parkingInfo?: string;
  @IsOptional() @IsDateString() rsvpDeadline?: string;
  @IsOptional() @IsBoolean() seatingPlanActivated?: boolean;
}
