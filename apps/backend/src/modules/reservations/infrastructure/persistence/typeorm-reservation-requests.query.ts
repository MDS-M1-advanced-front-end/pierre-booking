import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  ReservationRequestCriteria,
  ReservationRequestsPort,
  ReservationRequestView,
} from '../../application/ports/reservation-requests.port';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity';

/**
 * Implémentation TypeORM de `ReservationRequestsPort` : une requête, avec la salle et le demandeur
 * en jointure. Comme `TypeormDashboardQuery`, une lecture qui ne passe pas par le repository du
 * domaine (dont la réservation ne connaît que roomId et userId).
 */
@Injectable()
export class TypeormReservationRequestsQuery implements ReservationRequestsPort {
  constructor(
    @InjectRepository(TypeOrmReservationEntity)
    private readonly reservations: Repository<TypeOrmReservationEntity>,
  ) {}

  /** @inheritdoc */
  async find(
    criteria: ReservationRequestCriteria,
  ): Promise<ReservationRequestView[]> {
    const qb = this.reservations
      .createQueryBuilder('reservation')
      .innerJoinAndSelect('reservation.room', 'room')
      // Alias requester : user est un mot réservé de PostgreSQL
      .innerJoinAndSelect('reservation.user', 'requester')
      .where('reservation.status IN (:...statuses)', {
        statuses: criteria.statuses,
      })
      .orderBy('reservation.startAt', criteria.order)
      .addOrderBy('reservation.createdAt', 'ASC')
      // limit et non take : les jointures many-to-one ne multiplient pas les lignes
      .limit(criteria.limit);
    if (criteria.roomOwnerId) {
      qb.andWhere('room.ownerId = :ownerId', { ownerId: criteria.roomOwnerId });
    }
    const rows = await qb.getMany();
    return rows.map(({ room, user, ...reservation }) => ({
      id: reservation.id,
      room: {
        id: room.id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        pricePerHour: room.pricePerHour,
        status: room.status,
      },
      requester: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      status: reservation.status,
      numberOfParticipants: reservation.numberOfParticipants,
      comment: reservation.comment,
      totalAmount: reservation.totalAmount,
      currency: reservation.currency,
      createdAt: reservation.createdAt,
    }));
  }
}
