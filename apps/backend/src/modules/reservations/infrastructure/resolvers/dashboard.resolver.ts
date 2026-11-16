import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import type {
  ClientPerformance,
  PeriodInput,
  RoomPerformance,
  Statistics,
  StatusBreakdown,
  TimelinePoint,
} from '@room-booking/core/graphql';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { Roles } from '../../../users/infrastructure/auth/auth.decorators';
import { GetDashboardUseCase } from '../../application/use-cases/get-dashboard.use-case';
import { GetStatisticsUseCase } from '../../application/use-cases/get-statistics.use-case';
import {
  RoomsArgsDTO,
  TimelineArgsDTO,
  TopClientsArgsDTO,
} from '../dtos/dashboard.dto';

/** Objet `Dashboard` avant ses champs calculés : la période, transmise à chaque champ. */
interface DashboardPeriod {
  from: string | null;
  to: string | null;
}

/**
 * Tableau de bord GraphQL (admin.graphql du core), réservé aux administrateurs.
 * AuthGuard contrôle @Roles sur la requête `dashboard` ; les champs, qui ne sont atteignables qu'à
 * travers elle, ne repassent pas par les guards. Les types de retour sont ceux générés depuis le
 * schéma : un écart avec le contrat est une erreur de compilation.
 */
@Resolver('Dashboard')
@Roles(UserRole.ADMINISTRATEUR)
export class DashboardResolver {
  constructor(
    private readonly getStatisticsUseCase: GetStatisticsUseCase,
    private readonly getDashboardUseCase: GetDashboardUseCase,
  ) {}

  /**
   * Query.dashboard : ne calcule rien, chaque champ demandé est résolu ensuite.
   * @param period - Période facultative, dates déjà validées par le scalaire Date.
   */
  @Query('dashboard')
  dashboard(@Args('period') period?: PeriodInput | null): DashboardPeriod {
    return { from: period?.from ?? null, to: period?.to ?? null };
  }

  @ResolveField('statistics')
  statistics(@Parent() { from, to }: DashboardPeriod): Promise<Statistics> {
    return this.getStatisticsUseCase.execute(
      from ?? undefined,
      to ?? undefined,
    );
  }

  @ResolveField('byStatus')
  byStatus(
    @Parent() { from, to }: DashboardPeriod,
  ): Promise<StatusBreakdown[]> {
    return this.getDashboardUseCase.byStatus(
      from ?? undefined,
      to ?? undefined,
    );
  }

  @ResolveField('timeline')
  timeline(
    @Parent() { from, to }: DashboardPeriod,
    @Args() args: TimelineArgsDTO,
  ): Promise<TimelinePoint[]> {
    return this.getDashboardUseCase.timeline(
      from ?? undefined,
      to ?? undefined,
      args.granularity,
    );
  }

  @ResolveField('rooms')
  rooms(
    @Parent() { from, to }: DashboardPeriod,
    @Args() args: RoomsArgsDTO,
  ): Promise<RoomPerformance[]> {
    return this.getDashboardUseCase.rooms(
      from ?? undefined,
      to ?? undefined,
      args,
    );
  }

  @ResolveField('topClients')
  topClients(
    @Parent() { from, to }: DashboardPeriod,
    @Args() args: TopClientsArgsDTO,
  ): Promise<ClientPerformance[]> {
    return this.getDashboardUseCase.topClients(
      from ?? undefined,
      to ?? undefined,
      args.limit,
    );
  }
}
