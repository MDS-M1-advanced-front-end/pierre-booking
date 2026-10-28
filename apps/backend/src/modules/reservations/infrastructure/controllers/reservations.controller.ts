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
import { NonEmptyBodyPipe } from '../../../../common/non-empty-body.pipe.js';
import { toSkipTake } from '../../../../common/pagination.dto.js';
import {
  CurrentUser,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators.js';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation.use-case.js';
import { ConfirmReservationUseCase } from '../../application/use-cases/confirm-reservation.use-case.js';
import { CreateReservationUseCase } from '../../application/use-cases/create-reservation.use-case.js';
import { GetReservationUseCase } from '../../application/use-cases/get-reservation.use-case.js';
import { ListReservationsUseCase } from '../../application/use-cases/list-reservations.use-case.js';
import { RejectReservationUseCase } from '../../application/use-cases/reject-reservation.use-case.js';
import { UpdateReservationUseCase } from '../../application/use-cases/update-reservation.use-case.js';
import { toReservationDTO } from '../dtos/reservation-dto.mapper.js';
import {
  CreateReservationDTO,
  PaginatedReservationsDTO,
  RejectReservationDTO,
  ReservationDTO,
  ReservationsQueryDTO,
  UpdateReservationDTO,
} from '../dtos/reservations.dto.js';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter.js';
import { toActor } from './actor.js';

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

  @Get(':reservationId')
  async findOne(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return toReservationDTO(
      await this.getReservationUseCase.execute(reservationId, toActor(user)),
    );
  }

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

  // Annulation logique : passage au statut CANCELLED
  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.cancelReservationUseCase.execute(reservationId, toActor(user));
  }

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
