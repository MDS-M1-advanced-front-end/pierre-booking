import type { ReservationRequest } from '@room-booking/core/graphql';
import type { ReservationRequestView } from '../../application/ports/reservation-requests.port';

/**
 * Réservation lue en base → type `ReservationRequest` du contrat GraphQL (instants ISO, comme en
 * REST).
 * @param view - Réservation avec sa salle et son demandeur.
 */
export const toReservationRequest = (
  view: ReservationRequestView,
): ReservationRequest => ({
  ...view,
  startAt: view.startAt.toISOString(),
  endAt: view.endAt.toISOString(),
  createdAt: view.createdAt.toISOString(),
});
