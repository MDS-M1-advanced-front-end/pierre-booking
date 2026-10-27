import {
  Controller,
  Get,
  NotImplementedException,
  Query,
} from '@nestjs/common';
import { PaginatedReservationsDTO } from '../reservations/reservations.dto.js';
import {
  AdminReservationsQueryDTO,
  StatisticsDTO,
  StatisticsQueryDTO,
} from './admin.dto.js';

@Controller('admin')
export class AdminController {
  @Get('reservations')
  findReservations(
    @Query() query: AdminReservationsQueryDTO,
  ): PaginatedReservationsDTO {
    throw new NotImplementedException();
  }

  @Get('statistics')
  getStatistics(@Query() query: StatisticsQueryDTO): StatisticsDTO {
    throw new NotImplementedException();
  }
}
