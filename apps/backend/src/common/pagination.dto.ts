import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

/** Paramètres `page` (défaut 1) et `pageSize` (défaut 20, au plus 100) des listes paginées. */
export class PaginationQueryDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;
}

/** Champs communs des réponses paginées ; chaque liste y ajoute ses `items`. */
export class PaginatedDTO {
  @IsInt()
  @IsNotEmpty()
  page: number;

  @IsInt()
  @IsNotEmpty()
  pageSize: number;

  @IsInt()
  @IsNotEmpty()
  total: number;
}

/**
 * Applique les valeurs par défaut de la pagination.
 * @param query - Paramètres reçus (`page` et `pageSize` facultatifs).
 * @returns Le nombre d'éléments à sauter et à prendre, avec `page` et `pageSize` résolus.
 */
export function toSkipTake({ page = 1, pageSize = 20 }: PaginationQueryDTO) {
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
