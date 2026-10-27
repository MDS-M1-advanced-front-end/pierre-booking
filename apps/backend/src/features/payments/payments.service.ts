import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/database-errors.js';
import { Payment } from '../../models/payments.model.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { ACTIVE_RESERVATION_STATUSES } from '../reservations/reservations.constants.js';
import { ReservationsService } from '../reservations/reservations.service.js';
import { UserRole } from '../users/users.dto.js';
import {
  PaymentStatus,
  type CreatePaymentDTO,
  type PaymentDTO,
} from './payments.dto.js';
import { toPaymentDTO } from './payments.mapper.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly reservationsService: ReservationsService,
  ) {}

  // Réservé au client auteur de la réservation
  async create(body: CreatePaymentDTO, user: AuthUser): Promise<PaymentDTO> {
    const reservation = await this.reservationsService.getOrFail(
      body.reservationId,
    );
    if (reservation.userId !== user.id) throw new ForbiddenException();
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new ConflictException(
        `Réservation au statut ${reservation.status} : elle ne peut pas être payée`,
      );
    }

    // Système de paiement externe simulé : le paiement est accepté immédiatement
    try {
      const payment = await this.payments.save(
        this.payments.create({
          reservationId: reservation.id,
          amount: reservation.totalAmount,
          currency: reservation.currency,
          paymentMethod: body.paymentMethod,
          status: PaymentStatus.PAID,
          externalTransactionId: `mock_${randomUUID()}`,
        }),
      );
      return toPaymentDTO(payment);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('La réservation a déjà un paiement');
      }
      throw error;
    }
  }

  async findOne(paymentId: string, user: AuthUser): Promise<PaymentDTO> {
    const payment = await this.payments.findOne({
      where: { id: paymentId },
      relations: { reservation: true },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (
      payment.reservation.userId !== user.id &&
      user.role !== UserRole.ADMINISTRATEUR
    ) {
      throw new ForbiddenException();
    }
    return toPaymentDTO(payment);
  }
}
