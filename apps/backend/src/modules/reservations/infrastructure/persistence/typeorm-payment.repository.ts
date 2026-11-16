import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../../common/database-errors';
import {
  PaymentStatus,
  type Payment,
  type PaymentMethod,
} from '../../domain/entities/payment.entity';
import { ReservationConflictException } from '../../domain/exceptions/reservation-domain.exception';
import type { PaymentRepositoryInterface } from '../../domain/repositories/payment.repository.interface';
import { PaymentMapper } from './payment.mapper';
import { TypeOrmPaymentEntity } from './typeorm-payment.entity';

/** Implémentation TypeORM de `PaymentRepositoryInterface`. */
@Injectable()
export class TypeormPaymentRepository implements PaymentRepositoryInterface {
  constructor(
    @InjectRepository(TypeOrmPaymentEntity)
    private readonly typeormPaymentRepository: Repository<TypeOrmPaymentEntity>,
  ) {}

  /** @inheritdoc */
  async findById(id: string): Promise<Payment | null> {
    const entity = await this.typeormPaymentRepository.findOneBy({ id });
    return entity ? PaymentMapper.toDomain(entity) : null;
  }

  /** @inheritdoc */
  async save(payment: Payment): Promise<Payment> {
    try {
      const saved = await this.typeormPaymentRepository.save(
        PaymentMapper.toOrm(payment),
      );
      return PaymentMapper.toDomain(
        await this.typeormPaymentRepository.findOneByOrFail({ id: saved.id }),
      );
    } catch (error) {
      // reservation_id unique : une réservation a au plus un paiement
      if (isUniqueViolation(error)) {
        throw new ReservationConflictException(
          'La réservation a déjà un paiement',
        );
      }
      throw error;
    }
  }

  /** @inheritdoc */
  async retryFailed(
    reservationId: string,
    method: PaymentMethod,
  ): Promise<Payment | null> {
    const result = await this.typeormPaymentRepository
      .createQueryBuilder()
      .update()
      .set({
        status: PaymentStatus.PENDING,
        paymentMethod: method,
        externalTransactionId: null,
        paymentUrl: null,
      })
      .where('reservation_id = :reservationId AND status = :failed', {
        reservationId,
        failed: PaymentStatus.FAILED,
      })
      .returning('id')
      .execute();
    const [row] = result.raw as { id: string }[];
    return row ? this.findById(row.id) : null;
  }
}
