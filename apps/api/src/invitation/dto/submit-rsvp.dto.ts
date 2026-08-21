import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SubmitRsvpDto {
  @IsIn(['CONFIRMED', 'DECLINED'])
  status!: 'CONFIRMED' | 'DECLINED';

  @IsOptional()
  @IsInt()
  @Min(0)
  confirmedCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberNames?: string[];

  @IsOptional()
  @IsString()
  dietaryNotes?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
