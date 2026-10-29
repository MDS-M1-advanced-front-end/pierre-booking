import { Inject, Injectable } from '@nestjs/common';
import { ReservationStatus } from '../../domain/entities/reservation.entity';
import {
  DASHBOARD,
  type ClientPerformance,
  type DashboardPort,
  type Granularity,
  type RoomPerformance,
  type RoomSort,
  type SortDirection,
  type StatusBreakdown,
  type TimelinePoint,
} from '../ports/dashboard.port';
import { toPeriod } from '../period';

/**
 * Tableau de bord GraphQL (administrateurs). Une méthode par champ de `Dashboard` : GraphQL ne
 * calcule que les champs demandés. from / to : dates de Paris, incluses, appliquées à la date de
 * début des réservations ; absentes, toute la période.
 */
@Injectable()
export class GetDashboardUseCase {
  constructor(@Inject(DASHBOARD) private readonly dashboard: DashboardPort) {}

  /**
   * @returns Une ligne par statut, dans l'ordre du cycle de vie, à 0 si le statut est absent.
   */
  async byStatus(from?: string, to?: string): Promise<StatusBreakdown[]> {
    const rows = await this.dashboard.countByStatus(toPeriod(from, to));
    return Object.values(ReservationStatus).map(
      (status) =>
        rows.find((row) => row.status === status) ?? {
          status,
          count: 0,
          amount: 0,
        },
    );
  }

  /**
   * @param granularity - Jour, semaine ou mois.
   * @returns Les intervalles qui ont au moins une réservation.
   */
  timeline(
    from: string | undefined,
    to: string | undefined,
    granularity: Granularity,
  ): Promise<TimelinePoint[]> {
    return this.dashboard.timeline(toPeriod(from, to), granularity);
  }

  /**
   * @param ranking - Critère, sens et nombre de salles.
   * @returns Les salles classées.
   */
  rooms(
    from: string | undefined,
    to: string | undefined,
    ranking: { sort: RoomSort; direction: SortDirection; limit: number },
  ): Promise<RoomPerformance[]> {
    return this.dashboard.rankRooms(toPeriod(from, to), ranking);
  }

  /**
   * @param limit - Nombre de clients.
   * @returns Les meilleurs clients par chiffre d'affaires.
   */
  topClients(
    from: string | undefined,
    to: string | undefined,
    limit: number,
  ): Promise<ClientPerformance[]> {
    return this.dashboard.topClients(toPeriod(from, to), limit);
  }
}
