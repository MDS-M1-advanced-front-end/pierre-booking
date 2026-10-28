import { Payment } from '../../domain/entities/payment.entity.js';
import { TypeOrmPaymentEntity } from './typeorm-payment.entity.js';

/** Conversion entre l'entité TypeORM et l'entité du domaine (paiement). */
export class PaymentMapper {
  /**
   * @param ormEntity - Ligne lue en base.
   * @returns L'entité du domaine.
   */
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

  /**
   * Sans identifiant, l'entité TypeORM sera insérée ; avec, mise à jour.
   * @param domainEntity - Entité du domaine.
   * @returns L'entité TypeORM à enregistrer.
   */
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
