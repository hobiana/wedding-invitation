import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { UpdateHouseholdDto as UpdateHouseholdContract } from '@invitation-app/shared';

export class UpdateHouseholdDto implements UpdateHouseholdContract {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  allocatedSeats?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberNames?: string[];

  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'DECLINED'])
  status?: 'PENDING' | 'CONFIRMED' | 'DECLINED';

  @IsOptional()
  @IsInt()
  @Min(0)
  confirmedCount?: number;

  @IsOptional()
  @IsString()
  dietaryNotes?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
