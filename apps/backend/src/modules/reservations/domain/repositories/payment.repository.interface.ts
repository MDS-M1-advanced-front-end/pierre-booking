import type { Payment } from '../entities/payment.entity.js';

export interface PaymentRepositoryInterface {
  findById(id: string): Promise<Payment | null>;
  // ReservationConflictException si la réservation a déjà un paiement
  save(payment: Payment): Promise<Payment>;
}

export const PAYMENT_REPOSITORY = 'PaymentRepositoryInterface';
