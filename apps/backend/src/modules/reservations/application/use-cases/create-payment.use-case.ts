import { Inject, Injectable } from '@nestjs/common';
import {
  Payment,
  PaymentStatus,
  type PaymentMethod,
} from '../../domain/entities/payment.entity';
import type { ReservationActor } from '../../domain/entities/reservation.entity';
import {
  ReservationAccessDeniedException,
  ReservationConflictException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryInterface,
} from '../../domain/repositories/payment.repository.interface';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface';
import {
  PAYMENT_GATEWAY,
  type PaymentGatewayPort,
} from '../ports/payment-gateway.port';

/**
 * POST /payments : paie une réservation auprès du prestataire.
 * Réservé au client auteur de la réservation.
 */
@Injectable()
export class CreatePaymentUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryInterface,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
  ) {}

  /**
   * @param reservationId - UUID de la réservation à payer.
   * @param method - Moyen de paiement.
   * @param actor - Utilisateur connecté.
   * @returns Le paiement enregistré, avec le statut renvoyé par le prestataire.
   * @throws {ReservationNotFoundException} Réservation introuvable.
   * @throws {ReservationAccessDeniedException} L'utilisateur n'est pas l'auteur.
   * @throws {ReservationConflictException} Réservation REJECTED, CANCELLED ou COMPLETED, ou qui a
   *   déjà un paiement PENDING ou PAID (un paiement FAILED est retenté).
   */
  async execute(
    reservationId: string,
    method: PaymentMethod,
    actor: ReservationActor,
  ): Promise<Payment> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) throw new ReservationNotFoundException();
    if (!reservation.isAuthor(actor)) {
      throw new ReservationAccessDeniedException();
    }
    if (!reservation.isActive) {
      throw new ReservationConflictException(
        `Réservation au statut ${reservation.status} : elle ne peut pas être payée`,
      );
    }

    // Réserver l'unicité du paiement AVANT de débiter : une seconde requête concurrente (ou un
    // second appel) est rejetée ici par la contrainte d'unicité `reservation_id`, donc le
    // prestataire n'est jamais débité deux fois. Le paiement est créé PENDING (ou un paiement
    // FAILED est repris) puis mis à jour avec le résultat du débit.
    // ReservationConflictException si la réservation a déjà un paiement PENDING ou PAID.
    const payment =
      (await this.paymentRepository.retryFailed(reservation.id!, method)) ??
      (await this.paymentRepository.save(
        new Payment({
          reservationId: reservation.id!,
          amount: reservation.totalAmount,
          currency: reservation.currency,
          paymentMethod: method,
          status: PaymentStatus.PENDING,
          externalTransactionId: null,
          paymentUrl: null,
        }),
      ));

    try {
      const charge = await this.gateway.charge({
        amount: reservation.totalAmount,
        currency: reservation.currency,
        method,
      });
      payment.status = charge.status;
      payment.externalTransactionId = charge.externalTransactionId;
      payment.paymentUrl = charge.paymentUrl;
    } catch (error) {
      // Prestataire injoignable ou en erreur : FAILED, pour qu'une nouvelle tentative le reprenne
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
      throw error;
    }
    return this.paymentRepository.save(payment);
  }
}
