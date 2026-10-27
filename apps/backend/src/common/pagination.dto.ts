import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

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

export function toSkipTake({ page = 1, pageSize = 20 }: PaginationQueryDTO) {
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
