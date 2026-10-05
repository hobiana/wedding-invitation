import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
// Types seulement : `@invitation-app/shared` est du TypeScript brut, qu'un
// import de valeur ferait planter `node dist/main` (voir CLAUDE.md). Les listes
// de valeurs admises vivent donc ici.
import type {
  HouseholdSortKey,
  ListHouseholdsQuery,
  RsvpStatus,
  SortOrder,
} from '@invitation-app/shared';

export const DEFAULT_HOUSEHOLD_PAGE_SIZE = 100;
/**
 * Le tableau de bord et le plan de table demandent cette limite pour « tout
 * voir ». S'il y a un jour plus de foyers, ils le savent par `total`.
 */
export const MAX_HOUSEHOLD_PAGE_SIZE = 500;

const SORT_KEYS: HouseholdSortKey[] = ['name', 'seats', 'status', 'createdAt'];
const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];
const STATUSES: RsvpStatus[] = ['PENDING', 'CONFIRMED', 'DECLINED'];

/**
 * Les défauts sont des initialiseurs : `ValidationPipe({ transform: true })`
 * instancie la classe avant d'y recopier la requête, donc un paramètre absent
 * garde sa valeur par défaut et le service reçoit toujours une requête
 * complète.
 */
export class ListHouseholdsQueryDto implements ListHouseholdsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_HOUSEHOLD_PAGE_SIZE)
  limit: number = DEFAULT_HOUSEHOLD_PAGE_SIZE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: RsvpStatus;

  @IsOptional()
  @IsIn(SORT_KEYS)
  sort: HouseholdSortKey = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: SortOrder = 'asc';
}
