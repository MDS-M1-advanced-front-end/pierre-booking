import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReservationStatus } from '../../domain/entities/reservation.entity.js';
import { IsOptionalNotNull } from '../../../../common/validators.js';
import { DATE_REGEX } from '../../../../common/formats.js';
import {
  PaginatedDTO,
  PaginationQueryDTO,
} from '../../../../common/pagination.dto.js';

/** Réservation renvoyée par l'API (schéma Reservation du contrat). */
export class ReservationDTO {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsISO8601()
  @IsNotEmpty()
  startAt: string;

  @IsISO8601()
  @IsNotEmpty()
  endAt: string;

  @IsEnum(ReservationStatus)
  @IsNotEmpty()
  status: ReservationStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfParticipants?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsISO8601()
  @IsOptional()
  createdAt?: string;
}

/**
 * POST /reservations.
 * startAt < endAt et numberOfParticipants <= capacité : vérifiés dans le domaine.
 */
export class CreateReservationDTO {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @IsISO8601()
  @IsNotEmpty()
  startAt: string;

  @IsISO8601()
  @IsNotEmpty()
  endAt: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfParticipants?: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  comment?: string;
}

/** PATCH /reservations/{reservationId} : au moins un champ. */
export class UpdateReservationDTO {
  @IsISO8601()
  @IsOptionalNotNull()
  startAt?: string;

  @IsISO8601()
  @IsOptionalNotNull()
  endAt?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfParticipants?: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  comment?: string;
}

/** POST /reservations/{reservationId}/reject : corps facultatif. */
export class RejectReservationDTO {
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}

/** GET /reservations : filtres et pagination. */
export class ReservationsQueryDTO extends PaginationQueryDTO {
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @Matches(DATE_REGEX)
  @IsOptional()
  from?: string;

  @Matches(DATE_REGEX)
  @IsOptional()
  to?: string;
}

/** Page de réservations (schéma PaginatedReservations du contrat). */
export class PaginatedReservationsDTO extends PaginatedDTO {
  @ValidateNested({ each: true })
  @Type(() => ReservationDTO)
  items: ReservationDTO[];
}
