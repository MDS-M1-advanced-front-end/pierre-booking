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
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import {
  CreateReservationDTO,
  PaginatedReservationsDTO,
  RejectReservationDTO,
  ReservationDTO,
  ReservationsQueryDTO,
  UpdateReservationDTO,
} from './reservations.dto.js';
import { ReservationsService } from './reservations.service.js';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  findMine(
    @Query() query: ReservationsQueryDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedReservationsDTO> {
    return this.reservationsService.findMine(query, user);
  }

  @Post()
  create(
    @Body() body: CreateReservationDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return this.reservationsService.create(body, user);
  }

  @Get(':reservationId')
  findOne(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return this.reservationsService.findOne(reservationId, user);
  }

  @Patch(':reservationId')
  update(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: UpdateReservationDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return this.reservationsService.update(reservationId, body, user);
  }

  // Annulation logique : passage au statut CANCELLED
  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.reservationsService.cancel(reservationId, user);
  }

  @Post(':reservationId/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return this.reservationsService.confirm(reservationId, user);
  }

  @Post(':reservationId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: RejectReservationDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDTO> {
    return this.reservationsService.reject(reservationId, body, user);
  }
}
