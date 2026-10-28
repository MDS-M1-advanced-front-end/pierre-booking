import { Inject, Injectable } from '@nestjs/common';
import { addDays, fromParis } from '../../../../common/paris-time.js';
import {
  STATISTICS,
  type Statistics,
  type StatisticsPort,
} from '../ports/statistics.port.js';

/** GET /admin/statistics (administrateurs) : statistiques de la plateforme. */
@Injectable()
export class GetStatisticsUseCase {
  constructor(
    @Inject(STATISTICS) private readonly statistics: StatisticsPort,
  ) {}

  /**
   * from / to : dates de Paris, incluses, appliquées à la date de début des réservations.
   * @param from - Première date (YYYY-MM-DD), facultative.
   * @param to - Dernière date (YYYY-MM-DD), facultative.
   * @returns Les statistiques ; utilisateurs et salles comptés sans tenir compte de la période.
   */
  execute(from?: string, to?: string): Promise<Statistics> {
    return this.statistics.compute({
      from: from ? fromParis(from) : undefined,
      before: to ? fromParis(addDays(to, 1)) : undefined,
    });
  }
}
