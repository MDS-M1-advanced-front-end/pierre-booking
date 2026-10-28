import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../../common/database-errors.js';
import type { Payment } from '../../domain/entities/payment.entity.js';
import { ReservationConflictException } from '../../domain/exceptions/reservation-domain.exception.js';
import type { PaymentRepositoryInterface } from '../../domain/repositories/payment.repository.interface.js';
import { PaymentMapper } from './payment.mapper.js';
import { TypeOrmPaymentEntity } from './typeorm-payment.entity.js';

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
}
