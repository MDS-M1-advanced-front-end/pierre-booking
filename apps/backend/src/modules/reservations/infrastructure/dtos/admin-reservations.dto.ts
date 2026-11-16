// Les arguments facultatifs du schéma sont typés `T | null` (avoidOptionals du codegen) ; à
// l'exécution, un argument omis est absent : les resolvers le lisent avec `?? undefined`.
import type {
  MutationCancelReservationArgs,
  MutationConfirmReservationArgs,
  MutationRejectReservationArgs,
  QueryReservationsArgs,
  ReservationFilter,
} from '@room-booking/core/graphql';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReservationStatus } from '../../domain/entities/reservation.entity';

// Arguments des opérations GraphQL de l'administration des réservations (admin.graphql).
// GraphQL vérifie déjà les types et les enums ; les décorateurs bornent la pagination et le
// motif, et refusent un identifiant qui n'est pas un UUID (PostgreSQL lèverait une erreur 500).

/** Filtres de `Query.reservations`. */
export class ReservationFilterDTO implements ReservationFilter {
  @IsEnum(ReservationStatus)
  @IsOptional()
  status: ReservationStatus | null;

  @IsUUID()
  @IsOptional()
  roomId: string | null;

  @IsUUID()
  @IsOptional()
  userId: string | null;
}

/** Arguments de `Query.reservations`. */
export class ReservationsArgsDTO implements QueryReservationsArgs {
  @ValidateNested()
  @Type(() => ReservationFilterDTO)
  @IsOptional()
  filter: ReservationFilterDTO | null;

  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number;
}

/** Arguments de `Mutation.confirmReservation` et `Mutation.cancelReservation`. */
export class ReservationIdArgsDTO
  implements MutationConfirmReservationArgs, MutationCancelReservationArgs
{
  @IsUUID()
  reservationId: string;
}

/** Arguments de `Mutation.rejectReservation` : motif de 1000 caractères au plus, comme en REST. */
export class RejectReservationArgsDTO implements MutationRejectReservationArgs {
  @IsUUID()
  reservationId: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason: string | null;
}
