import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { toSkipTake } from '../../../../common/pagination.dto.js';
import { UserRole } from '../../../users/domain/entities/user.entity.js';
import { Roles } from '../../../users/infrastructure/auth/auth.decorators.js';
import { GetStatisticsUseCase } from '../../application/use-cases/get-statistics.use-case.js';
import { ListAllReservationsUseCase } from '../../application/use-cases/list-all-reservations.use-case.js';
import {
  AdminReservationsQueryDTO,
  StatisticsDTO,
  StatisticsQueryDTO,
} from '../dtos/admin.dto.js';
import { toReservationDTO } from '../dtos/reservation-dto.mapper.js';
import { PaginatedReservationsDTO } from '../dtos/reservations.dto.js';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter.js';

@Controller('admin')
@Roles(UserRole.ADMINISTRATEUR)
@UseFilters(ReservationExceptionFilter)
export class AdminController {
  constructor(
    private readonly listAllReservationsUseCase: ListAllReservationsUseCase,
    private readonly getStatisticsUseCase: GetStatisticsUseCase,
  ) {}

  @Get('reservations')
  async findReservations(
    @Query() query: AdminReservationsQueryDTO,
  ): Promise<PaginatedReservationsDTO> {
    const { page, pageSize } = toSkipTake(query);
    const { items, total } = await this.listAllReservationsUseCase.execute({
      status: query.status,
      roomId: query.roomId,
      userId: query.userId,
      page,
      pageSize,
    });
    return { items: items.map(toReservationDTO), page, pageSize, total };
  }

  @Get('statistics')
  getStatistics(@Query() query: StatisticsQueryDTO): Promise<StatisticsDTO> {
    return this.getStatisticsUseCase.execute(query.from, query.to);
  }
}
