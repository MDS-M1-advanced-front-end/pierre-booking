import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import type {
  ReservationPageCriteria,
  ReservationRequestCriteria,
  ReservationRequestsPort,
  ReservationRequestView,
} from '../../application/ports/reservation-requests.port';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity';

/**
 * Implémentation TypeORM de `ReservationRequestsPort` : une requête par lecture, avec la salle et
 * le demandeur en jointure. Comme `TypeormDashboardQuery`, une lecture qui ne passe pas par le repository du
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
    const qb = this.withRoomAndRequester()
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
    return rows.map(toView);
  }

  /** @inheritdoc */
  async findPage(
    criteria: ReservationPageCriteria,
  ): Promise<{ items: ReservationRequestView[]; total: number }> {
    const qb = this.withRoomAndRequester()
      .orderBy('reservation.startAt', 'DESC')
      .addOrderBy('reservation.id', 'ASC')
      .offset((criteria.page - 1) * criteria.pageSize)
      .limit(criteria.pageSize);
    if (criteria.status) {
      qb.andWhere('reservation.status = :status', { status: criteria.status });
    }
    if (criteria.roomId) {
      qb.andWhere('reservation.roomId = :roomId', { roomId: criteria.roomId });
    }
    if (criteria.userId) {
      qb.andWhere('reservation.userId = :userId', { userId: criteria.userId });
    }
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(toView), total };
  }

  /** @inheritdoc */
  async findById(id: string): Promise<ReservationRequestView | null> {
    const row = await this.withRoomAndRequester()
      .where('reservation.id = :id', { id })
      .getOne();
    return row ? toView(row) : null;
  }

  /** Réservations avec leur salle et leur demandeur, en jointure. */
  private withRoomAndRequester(): SelectQueryBuilder<TypeOrmReservationEntity> {
    return (
      this.reservations
        .createQueryBuilder('reservation')
        .innerJoinAndSelect('reservation.room', 'room')
        // Alias requester : user est un mot réservé de PostgreSQL
        .innerJoinAndSelect('reservation.user', 'requester')
    );
  }
}

/**
 * Ligne lue avec sa salle et son demandeur → vue du port.
 * @param row - Réservation, avec `room` et `user` chargés par la jointure.
 */
const toView = ({
  room,
  user,
  ...reservation
}: TypeOrmReservationEntity): ReservationRequestView => ({
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
  rejectionReason: reservation.rejectionReason,
  totalAmount: reservation.totalAmount,
  currency: reservation.currency,
  createdAt: reservation.createdAt,
});
