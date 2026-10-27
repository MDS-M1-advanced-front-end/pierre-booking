import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import { PaginatedReservationsDTO } from '../reservations/reservations.dto.js';
import { ReservationsService } from '../reservations/reservations.service.js';
import { UserRole } from '../users/users.dto.js';
import {
  AdminReservationsQueryDTO,
  StatisticsDTO,
  StatisticsQueryDTO,
} from './admin.dto.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@Roles(UserRole.ADMINISTRATEUR)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reservationsService: ReservationsService,
  ) {}

  @Get('reservations')
  findReservations(
    @Query() query: AdminReservationsQueryDTO,
  ): Promise<PaginatedReservationsDTO> {
    return this.reservationsService.findAll(query);
  }

  @Get('statistics')
  getStatistics(@Query() query: StatisticsQueryDTO): Promise<StatisticsDTO> {
    return this.adminService.getStatistics(query);
  }
}
