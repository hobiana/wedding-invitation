import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { CreateTableDto as CreateTableContract } from '@invitation-app/shared';

export class CreateTableDto implements CreateTableContract {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
