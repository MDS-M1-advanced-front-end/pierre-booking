import type { Payment } from '../../models/payments.model.js';
import type { PaymentDTO } from './payments.dto.js';

export function toPaymentDTO(payment: Payment): PaymentDTO {
  return {
    id: payment.id,
    reservationId: payment.reservationId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paymentUrl: payment.paymentUrl ?? undefined,
    createdAt: payment.createdAt.toISOString(),
  };
}
