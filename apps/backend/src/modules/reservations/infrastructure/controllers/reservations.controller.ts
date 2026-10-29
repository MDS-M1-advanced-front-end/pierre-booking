import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { NonEmptyBodyPipe } from '../../../../common/non-empty-body.pipe';
import { toSkipTake } from '../../../../common/pagination.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation.use-case';
import { ConfirmReservationUseCase } from '../../application/use-cases/confirm-reservation.use-case';
import { CreateReservationUseCase } from '../../application/use-cases/create-reservation.use-case';
import { GetReservationUseCase } from '../../application/use-cases/get-reservation.use-case';
import { ListReservationsUseCase } from '../../application/use-cases/list-reservations.use-case';
import { RejectReservationUseCase } from '../../application/use-cases/reject-reservation.use-case';
import { UpdateReservationUseCase } from '../../application/use-cases/update-reservation.use-case';
import { toReservationDTO } from '../dtos/reservation-dto.mapper';
import {
  CreateReservationDTO,
  PaginatedReservationsDTO,
  RejectReservationDTO,
  ReservationDTO,
  ReservationsQueryDTO,
  UpdateReservationDTO,
} from '../dtos/reservations.dto';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter';
import { toActor } from './actor';

/** Routes `/reservations` : consultation, création, modification et traitement des réservations. */
@Controller('reservations')
@UseFilters(ReservationExceptionFilter)
export class ReservationsController {
  constructor(
    private readonly listReservationsUseCase: ListReservationsUseCase,
    private readonly getReservationUseCase: GetReservationUseCase,
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly updateReservationUseCase: UpdateReservationUseCase,
    private readonly cancelReservationUseCase: CancelReservationUseCase,
    private readonly confirmReservationUseCase: ConfirmReservationUseCase,
    private readonly rejectReservationUseCase: RejectReservationUseCase,
  ) {}

  /**
   * GET /reservations : celles de l'utilisateur, ou celles de ses salles pour un gestionnaire.
   * @param query - Statut, période et pagination.
   * @param user - Utilisateur connecté.
   * @returns Une page de réservations.
   */
  @Get()
  async findMine(
    @Query() query: ReservationsQueryDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedReservationsDTO> {
    const { page, pageSize } = toSkipTake(query);
    const { items, total } = await this.listReservationsUseCase.execute(
      { status: query.status, from: query.from, to: query.to, page, pageSize },
      toActor(user),
    );
    return { items: items.map(toReservationDTO), page, pageSize, total };
  }

  /**
   * POST /reservations : réserve une salle (statut PENDING).
   * @param dto - Salle, créneau, participants, commentaire.
   * @param user - Utilisateur connecté.
   * @returns La réservation créée.
   */
  @Post()
  async create(
    @Body() dto: CreateReservationDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    const reservation = await this.createReservationUseCase.execute(
      {
        roomId: dto.roomId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        numberOfParticipants: dto.numberOfParticipants,
        comment: dto.comment,
      },
      toActor(user),
    );
    return toReservationDTO(reservation);
  }

  /**
   * GET /reservations/{reservationId} : auteur, gestionnaire de la salle ou administrateur.
   * @param reservationId - UUID de la réservation.
   * @param user - Utilisateur connecté.
   * @returns La réservation.
   */
  @Get(':reservationId')
  async findOne(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return toReservationDTO(
      await this.getReservationUseCase.execute(reservationId, toActor(user)),
    );
  }

  /**
   * PATCH /reservations/{reservationId} : un nouveau créneau repasse la réservation en PENDING.
   * @param reservationId - UUID de la réservation.
   * @param dto - Champs à modifier (au moins un).
   * @param user - Utilisateur connecté.
   * @returns La réservation modifiée.
   */
  @Patch(':reservationId')
  async update(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body(NonEmptyBodyPipe) dto: UpdateReservationDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    const reservation = await this.updateReservationUseCase.execute(
      reservationId,
      {
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        numberOfParticipants: dto.numberOfParticipants,
        comment: dto.comment,
      },
      toActor(user),
    );
    return toReservationDTO(reservation);
  }

  /**
   * DELETE /reservations/{reservationId}. Annulation logique : passage au statut CANCELLED.
   * @param reservationId - UUID de la réservation.
   * @param user - Utilisateur connecté.
   */
  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.cancelReservationUseCase.execute(reservationId, toActor(user));
  }

  /**
   * POST /reservations/{reservationId}/confirm : PENDING → CONFIRMED.
   * @param reservationId - UUID de la réservation.
   * @param user - Utilisateur connecté.
   * @returns La réservation confirmée.
   */
  @Post(':reservationId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return toReservationDTO(
      await this.confirmReservationUseCase.execute(
        reservationId,
        toActor(user),
      ),
    );
  }

  /**
   * POST /reservations/{reservationId}/reject : PENDING → REJECTED.
   * @param reservationId - UUID de la réservation.
   * @param dto - Motif du refus, facultatif.
   * @param user - Utilisateur connecté.
   * @returns La réservation refusée.
   */
  @Post(':reservationId/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() dto: RejectReservationDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return toReservationDTO(
      await this.rejectReservationUseCase.execute(
        reservationId,
        dto.reason,
        toActor(user),
      ),
    );
  }
}
