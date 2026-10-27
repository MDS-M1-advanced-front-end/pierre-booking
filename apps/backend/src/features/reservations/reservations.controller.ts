import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateReservationDTO,
  PaginatedReservationsDTO,
  RejectReservationDTO,
  ReservationDTO,
  ReservationsQueryDTO,
  UpdateReservationDTO,
} from './reservations.dto.js';

@Controller('reservations')
export class ReservationsController {
  @Get()
  findMine(@Query() query: ReservationsQueryDTO): PaginatedReservationsDTO {
    throw new NotImplementedException();
  }

  @Post()
  create(@Body() body: CreateReservationDTO): ReservationDTO {
    throw new NotImplementedException();
  }

  @Get(':reservationId')
  findOne(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): ReservationDTO {
    throw new NotImplementedException();
  }

  @Patch(':reservationId')
  update(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: UpdateReservationDTO,
  ): ReservationDTO {
    throw new NotImplementedException();
  }

  // Annulation logique : passage au statut CANCELLED
  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('reservationId', ParseUUIDPipe) reservationId: string): void {
    throw new NotImplementedException();
  }

  @Post(':reservationId/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): ReservationDTO {
    throw new NotImplementedException();
  }

  @Post(':reservationId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: RejectReservationDTO,
  ): ReservationDTO {
    throw new NotImplementedException();
  }
}
