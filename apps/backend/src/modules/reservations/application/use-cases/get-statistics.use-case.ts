import { Inject, Injectable } from '@nestjs/common';
import { addDays, fromParis } from '../../../../common/paris-time.js';
import {
  STATISTICS,
  type Statistics,
  type StatisticsPort,
} from '../ports/statistics.port.js';

// GET /admin/statistics (administrateurs)
@Injectable()
export class GetStatisticsUseCase {
  constructor(
    @Inject(STATISTICS) private readonly statistics: StatisticsPort,
  ) {}

  // from / to : dates de Paris, incluses, appliquées à la date de début des réservations
  execute(from?: string, to?: string): Promise<Statistics> {
    return this.statistics.compute({
      from: from ? fromParis(from) : undefined,
      before: to ? fromParis(addDays(to, 1)) : undefined,
    });
  }
}
