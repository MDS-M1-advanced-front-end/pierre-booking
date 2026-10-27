import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { DATE_REGEX } from '../../common/formats.js';
import { PaginationQueryDTO } from '../../common/pagination.dto.js';
import { ReservationStatus } from '../reservations/reservations.dto.js';

// GET /admin/reservations (réponse : PaginatedReservationsDTO)
export class AdminReservationsQueryDTO extends PaginationQueryDTO {
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

// GET /admin/statistics
export class StatisticsQueryDTO {
  @Matches(DATE_REGEX)
  @IsOptional()
  from?: string;

  @Matches(DATE_REGEX)
  @IsOptional()
  to?: string;
}

export class StatisticsDTO {
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
