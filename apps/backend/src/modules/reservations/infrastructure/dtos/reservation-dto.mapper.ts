import type { Payment } from '../../domain/entities/payment.entity.js';
import type { Reservation } from '../../domain/entities/reservation.entity.js';
import type { PaymentDTO } from './payments.dto.js';
import type { ReservationDTO } from './reservations.dto.js';

/**
 * Réservation du domaine → réponse de l'API (schéma Reservation du contrat : champs vides omis).
 * @param reservation - Réservation enregistrée.
 * @returns Le corps de réponse.
 */
export function toReservationDTO(reservation: Reservation): ReservationDTO {
  return {
    id: reservation.id!,
    roomId: reservation.roomId,
    userId: reservation.userId,
    startAt: reservation.startAt.toISOString(),
    endAt: reservation.endAt.toISOString(),
    status: reservation.status,
    numberOfParticipants: reservation.numberOfParticipants ?? undefined,
    comment: reservation.comment ?? undefined,
    totalAmount: reservation.totalAmount,
    currency: reservation.currency,
    createdAt: reservation.createdAt?.toISOString(),
  };
}

/**
 * Paiement du domaine → réponse de l'API (schéma Payment du contrat).
 * @param payment - Paiement enregistré.
 * @returns Le corps de réponse.
 */
export function toPaymentDTO(payment: Payment): PaymentDTO {
  return {
    id: payment.id!,
    reservationId: payment.reservationId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentUrl: payment.paymentUrl ?? undefined,
    createdAt: payment.createdAt?.toISOString(),
  };
}
