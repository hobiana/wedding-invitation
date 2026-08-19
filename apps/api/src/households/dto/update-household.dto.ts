import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateHouseholdDto {
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
