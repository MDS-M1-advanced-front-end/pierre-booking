// Toutes ces routes exigent une session : un `401` la vide (voir `withSession`).
import type {
  ListReservationsQuery,
  PaginatedReservations,
  Reservation,
  ReservationCreateRequest,
  ReservationRejectRequest,
  ReservationUpdateRequest,
  Result,
} from '@room-booking/core';
import * as api from '../client';
import { withSession } from '../errors';

/** Réservations de l'utilisateur connecté (y compris annulées), paginées. */
export function listMyReservations(
  query: ListReservationsQuery = {},
): Promise<Result<PaginatedReservations>> {
  return withSession(api.listMyReservations(query));
}

/** Détail d'une réservation. */
export function getReservation(reservationId: string): Promise<Result<Reservation>> {
  return withSession(api.getReservation(reservationId));
}

/** Réserve une salle (statut PENDING). `409` si le créneau est pris. */
export function createReservation(body: ReservationCreateRequest): Promise<Result<Reservation>> {
  return withSession(api.createReservation(body));
}

/** Modifie une réservation PENDING ou CONFIRMED. */
export function updateReservation(
  reservationId: string,
  body: ReservationUpdateRequest,
): Promise<Result<Reservation>> {
  return withSession(api.updateReservation(reservationId, body));
}

/** Annule une réservation (statut CANCELLED). */
export function cancelReservation(reservationId: string): Promise<Result<void>> {
  return withSession(api.cancelReservation(reservationId));
}

/** Confirme une réservation PENDING (gestionnaire de la salle, administrateur). */
export function confirmReservation(reservationId: string): Promise<Result<Reservation>> {
  return withSession(api.confirmReservation(reservationId));
}

/** Refuse une réservation PENDING, avec un motif facultatif. */
export function rejectReservation(
  reservationId: string,
  body?: ReservationRejectRequest,
): Promise<Result<Reservation>> {
  return withSession(api.rejectReservation(reservationId, body));
}
