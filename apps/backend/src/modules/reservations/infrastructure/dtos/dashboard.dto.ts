import type {
  DashboardRoomsArgs,
  DashboardTimelineArgs,
  DashboardTopClientsArgs,
} from '@room-booking/core/graphql';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import {
  GRANULARITIES,
  ROOM_SORTS,
  SORT_DIRECTIONS,
  type Granularity,
  type RoomSort,
  type SortDirection,
} from '../../application/ports/dashboard.port';

// Arguments des champs de Dashboard (admin.graphql). GraphQL vérifie déjà les types et les enums ;
// les décorateurs servent aux bornes de limit, et au ValidationPipe global (forbidNonWhitelisted
// refuse une propriété sans décorateur). Les valeurs par défaut viennent du schéma.

/** Plus grand classement renvoyé : au-delà, ce n'est plus un tableau de bord. */
const MAX_LIMIT = 50;

/** Arguments de `Dashboard.timeline`. */
export class TimelineArgsDTO implements DashboardTimelineArgs {
  @IsIn(GRANULARITIES)
  granularity: Granularity;
}

/** Arguments de `Dashboard.rooms`. */
export class RoomsArgsDTO implements DashboardRoomsArgs {
  @IsIn(ROOM_SORTS)
  sort: RoomSort;

  @IsIn(SORT_DIRECTIONS)
  direction: SortDirection;

  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number;
}

/** Arguments de `Dashboard.topClients`. */
export class TopClientsArgsDTO implements DashboardTopClientsArgs {
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number;
}
