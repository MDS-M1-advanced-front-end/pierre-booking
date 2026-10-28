import { Inject, Injectable } from '@nestjs/common';
import type { Payment } from '../../domain/entities/payment.entity.js';
import type { ReservationActor } from '../../domain/entities/reservation.entity.js';
import {
  ReservationAccessDeniedException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception.js';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryInterface,
} from '../../domain/repositories/payment.repository.interface.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface.js';

/**
 * GET /payments/{paymentId} : statut d'un paiement.
 * L'auteur de la réservation ou un administrateur.
 */
@Injectable()
export class GetPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryInterface,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
  ) {}

  /**
   * @param paymentId - UUID du paiement.
   * @param actor - Utilisateur connecté.
   * @returns Le paiement.
   * @throws {ReservationNotFoundException} Paiement introuvable.
   * @throws {ReservationAccessDeniedException} Ni auteur de la réservation ni administrateur.
   */
  async execute(paymentId: string, actor: ReservationActor): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment)
      throw new ReservationNotFoundException('Paiement introuvable');
    const reservation = await this.reservationRepository.findById(
      payment.reservationId,
    );
    if (!actor.isAdmin && reservation?.userId !== actor.id) {
      throw new ReservationAccessDeniedException();
    }
    return payment;
  }
}
