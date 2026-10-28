import type { Payment } from '../entities/payment.entity.js';

/** Persistance des paiements (implémentée par `TypeormPaymentRepository`). */
export interface PaymentRepositoryInterface {
  /**
   * @param id - UUID du paiement.
   * @returns Le paiement, ou null s'il n'existe pas.
   */
  findById(id: string): Promise<Payment | null>;
  /**
   * Enregistre un paiement.
   * @param payment - Paiement à enregistrer.
   * @returns Le paiement tel qu'enregistré (identifiant et date de création compris).
   * @throws {ReservationConflictException} La réservation a déjà un paiement.
   */
  save(payment: Payment): Promise<Payment>;
}

/** Jeton d'injection de `PaymentRepositoryInterface`. */
export const PAYMENT_REPOSITORY = 'PaymentRepositoryInterface';
