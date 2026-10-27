import type { Reservation } from '../../models/reservations.model.js';
import type { ReservationDTO } from './reservations.dto.js';

export function toReservationDTO(reservation: Reservation): ReservationDTO {
  return {
    id: reservation.id,
    roomId: reservation.roomId,
    userId: reservation.userId,
    startAt: reservation.startAt.toISOString(),
    endAt: reservation.endAt.toISOString(),
    status: reservation.status,
    numberOfParticipants: reservation.numberOfParticipants ?? undefined,
    comment: reservation.comment ?? undefined,
    totalAmount: reservation.totalAmount,
    currency: reservation.currency,
    createdAt: reservation.createdAt.toISOString(),
  };
}
