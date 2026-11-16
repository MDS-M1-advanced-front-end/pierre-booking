import type { Payment, PaymentMethod } from '../entities/payment.entity';

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
  /**
   * Reprend le paiement FAILED d'une réservation pour une nouvelle tentative : le repasse à
   * PENDING avec le nouveau moyen de paiement, en une seule écriture conditionnelle (deux
   * tentatives simultanées ne peuvent pas reprendre le même paiement).
   * @param reservationId - UUID de la réservation.
   * @param method - Moyen de paiement de la nouvelle tentative.
   * @returns Le paiement repris, ou null si la réservation n'a pas de paiement FAILED.
   */
  retryFailed(
    reservationId: string,
    method: PaymentMethod,
  ): Promise<Payment | null>;
}

/** Jeton d'injection de `PaymentRepositoryInterface`. */
export const PAYMENT_REPOSITORY = 'PaymentRepositoryInterface';
