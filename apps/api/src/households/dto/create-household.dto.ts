import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateHouseholdDto {
  @IsString()
  displayName!: string;

  @IsInt()
  @Min(1)
  allocatedSeats!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberNames?: string[];
}
