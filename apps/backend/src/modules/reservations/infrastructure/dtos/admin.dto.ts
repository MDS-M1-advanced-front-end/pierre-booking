import type {
  AdminReservationsQuery,
  Statistics,
  StatisticsQuery,
} from '@room-booking/core';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { DATE_REGEX } from '../../../../common/formats';
import { PaginationQueryDTO } from '../../../../common/pagination.dto';
import { ReservationStatus } from '../../domain/entities/reservation.entity';

/** GET /admin/reservations : filtres et pagination (réponse : PaginatedReservationsDTO). */
export class AdminReservationsQueryDTO
  extends PaginationQueryDTO
  implements AdminReservationsQuery
{
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}

/** GET /admin/statistics : période facultative. */
export class StatisticsQueryDTO implements StatisticsQuery {
  @Matches(DATE_REGEX)
  @IsOptional()
  from?: string;

  @Matches(DATE_REGEX)
  @IsOptional()
  to?: string;
}

/** Statistiques renvoyées par l'API (schéma Statistics du contrat). */
export class StatisticsDTO implements Statistics {
  @IsInt()
  @IsOptional()
  totalUsers?: number;

  @IsInt()
  @IsOptional()
  totalRooms?: number;

  @IsInt()
  @IsOptional()
  totalReservations?: number;

  @IsInt()
  @IsOptional()
  confirmedReservations?: number;

  @IsInt()
  @IsOptional()
  cancelledReservations?: number;

  @IsNumber()
  @IsOptional()
  totalRevenue?: number;
}
