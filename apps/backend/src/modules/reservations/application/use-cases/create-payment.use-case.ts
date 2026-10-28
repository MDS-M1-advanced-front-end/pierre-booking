import { Inject, Injectable } from '@nestjs/common';
import {
  Payment,
  type PaymentMethod,
} from '../../domain/entities/payment.entity.js';
import type { ReservationActor } from '../../domain/entities/reservation.entity.js';
import {
  ReservationAccessDeniedException,
  ReservationConflictException,
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
import {
  PAYMENT_GATEWAY,
  type PaymentGatewayPort,
} from '../ports/payment-gateway.port.js';

// Réservé au client auteur de la réservation
@Injectable()
export class CreatePaymentUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryInterface,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
  ) {}

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

    const charge = await this.gateway.charge({
      amount: reservation.totalAmount,
      currency: reservation.currency,
      method,
    });
    // ReservationConflictException si la réservation a déjà un paiement
    return this.paymentRepository.save(
      new Payment({
        reservationId: reservation.id!,
        amount: reservation.totalAmount,
        currency: reservation.currency,
        paymentMethod: method,
        ...charge,
      }),
    );
  }
}
