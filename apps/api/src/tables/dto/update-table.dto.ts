import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { UpdateTableDto as UpdateTableContract } from '@invitation-app/shared';

export class UpdateTableDto implements UpdateTableContract {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
