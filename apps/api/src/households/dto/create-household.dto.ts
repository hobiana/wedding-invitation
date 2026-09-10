import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { CreateHouseholdDto as CreateHouseholdContract } from '@invitation-app/shared';

export class CreateHouseholdDto implements CreateHouseholdContract {
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
