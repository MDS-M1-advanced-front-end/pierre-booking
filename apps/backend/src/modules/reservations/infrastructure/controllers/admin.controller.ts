import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { toSkipTake } from '../../../../common/pagination.dto';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { Roles } from '../../../users/infrastructure/auth/auth.decorators';
import { GetStatisticsUseCase } from '../../application/use-cases/get-statistics.use-case';
import { ListAllReservationsUseCase } from '../../application/use-cases/list-all-reservations.use-case';
import {
  AdminReservationsQueryDTO,
  StatisticsDTO,
  StatisticsQueryDTO,
} from '../dtos/admin.dto';
import { toReservationDTO } from '../dtos/reservation-dto.mapper';
import { PaginatedReservationsDTO } from '../dtos/reservations.dto';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter';

/** Routes `/admin`, réservées aux administrateurs. */
@Controller('admin')
@Roles(UserRole.ADMINISTRATEUR)
@UseFilters(ReservationExceptionFilter)
export class AdminController {
  constructor(
    private readonly listAllReservationsUseCase: ListAllReservationsUseCase,
    private readonly getStatisticsUseCase: GetStatisticsUseCase,
  ) {}

  /**
   * GET /admin/reservations : toutes les réservations, filtrables.
   * @param query - Statut, salle, client et pagination.
   * @returns Une page de réservations.
   */
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

  /**
   * GET /admin/statistics : compteurs et chiffre d'affaires.
   * @param query - Période (dates de Paris, bornes incluses), facultative.
   * @returns Les statistiques.
   */
  @Get('statistics')
  getStatistics(@Query() query: StatisticsQueryDTO): Promise<StatisticsDTO> {
    return this.getStatisticsUseCase.execute(query.from, query.to);
  }
}
