import type {
  ReservationRequestsHandledArgs,
  ReservationRequestsPendingArgs,
} from '@room-booking/core/graphql';
import { IsInt, Max, Min } from 'class-validator';

// Arguments des champs de ReservationRequests (admin.graphql) : bornes de limit, valeurs par
// défaut dans le schéma (voir dashboard.dto.ts).

/** Plus longue liste renvoyée, comme la taille de page maximale du REST. */
const MAX_LIMIT = 100;

/** Arguments de `ReservationRequests.pending` et `ReservationRequests.handled`. */
export class ReservationRequestsArgsDTO
  implements ReservationRequestsPendingArgs, ReservationRequestsHandledArgs
{
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number;
}
