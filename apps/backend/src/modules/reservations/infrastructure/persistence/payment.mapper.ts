import { Payment } from '../../domain/entities/payment.entity.js';
import { TypeOrmPaymentEntity } from './typeorm-payment.entity.js';

export class PaymentMapper {
  static toDomain(ormEntity: TypeOrmPaymentEntity): Payment {
    return new Payment({
      id: ormEntity.id,
      reservationId: ormEntity.reservationId,
      amount: ormEntity.amount,
      currency: ormEntity.currency,
      paymentMethod: ormEntity.paymentMethod,
      status: ormEntity.status,
      externalTransactionId: ormEntity.externalTransactionId,
      paymentUrl: ormEntity.paymentUrl,
      createdAt: ormEntity.createdAt,
    });
  }

  static toOrm(domainEntity: Payment): TypeOrmPaymentEntity {
    const ormEntity = new TypeOrmPaymentEntity();
    if (domainEntity.id) ormEntity.id = domainEntity.id;
    ormEntity.reservationId = domainEntity.reservationId;
    ormEntity.amount = domainEntity.amount;
    ormEntity.currency = domainEntity.currency;
    ormEntity.paymentMethod = domainEntity.paymentMethod;
    ormEntity.status = domainEntity.status;
    ormEntity.externalTransactionId = domainEntity.externalTransactionId;
    ormEntity.paymentUrl = domainEntity.paymentUrl;
    if (domainEntity.createdAt) ormEntity.createdAt = domainEntity.createdAt;
    return ormEntity;
  }
}
