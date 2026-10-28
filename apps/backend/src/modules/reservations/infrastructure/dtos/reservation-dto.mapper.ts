import type { Payment } from '../../domain/entities/payment.entity.js';
import type { Reservation } from '../../domain/entities/reservation.entity.js';
import type { PaymentDTO } from './payments.dto.js';
import type { ReservationDTO } from './reservations.dto.js';

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
