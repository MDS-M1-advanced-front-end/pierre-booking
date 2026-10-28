import { Reservation } from '../../domain/entities/reservation.entity.js';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity.js';

export class ReservationMapper {
  static toDomain(ormEntity: TypeOrmReservationEntity): Reservation {
    return new Reservation({
      id: ormEntity.id,
      roomId: ormEntity.roomId,
      userId: ormEntity.userId,
      startAt: ormEntity.startAt,
      endAt: ormEntity.endAt,
      status: ormEntity.status,
      numberOfParticipants: ormEntity.numberOfParticipants,
      comment: ormEntity.comment,
      totalAmount: ormEntity.totalAmount,
      currency: ormEntity.currency,
      rejectionReason: ormEntity.rejectionReason,
      createdAt: ormEntity.createdAt,
    });
  }

  static toOrm(domainEntity: Reservation): TypeOrmReservationEntity {
    const ormEntity = new TypeOrmReservationEntity();
    if (domainEntity.id) ormEntity.id = domainEntity.id;
    ormEntity.roomId = domainEntity.roomId;
    ormEntity.userId = domainEntity.userId;
    ormEntity.startAt = domainEntity.startAt;
    ormEntity.endAt = domainEntity.endAt;
    ormEntity.status = domainEntity.status;
    ormEntity.numberOfParticipants = domainEntity.numberOfParticipants;
    ormEntity.comment = domainEntity.comment;
    ormEntity.totalAmount = domainEntity.totalAmount;
    ormEntity.currency = domainEntity.currency;
    ormEntity.rejectionReason = domainEntity.rejectionReason;
    if (domainEntity.createdAt) ormEntity.createdAt = domainEntity.createdAt;
    return ormEntity;
  }
}
