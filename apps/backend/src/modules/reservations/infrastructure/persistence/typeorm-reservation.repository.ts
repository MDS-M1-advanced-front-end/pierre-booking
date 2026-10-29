import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  LessThan,
  MoreThan,
  Not,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { isExclusionViolation } from '../../../../common/database-errors.js';
import {
  ACTIVE_RESERVATION_STATUSES,
  type Reservation,
} from '../../domain/entities/reservation.entity.js';
import { ReservationConflictException } from '../../domain/exceptions/reservation-domain.exception.js';
import type {
  ReservationRepositoryInterface,
  ReservationSearchCriteria,
} from '../../domain/repositories/reservation.repository.interface.js';
import { ReservationMapper } from './reservation.mapper.js';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity.js';

/** Implémentation TypeORM de `ReservationRepositoryInterface`. */
@Injectable()
export class TypeormReservationRepository implements ReservationRepositoryInterface {
  constructor(
    @InjectRepository(TypeOrmReservationEntity)
    private readonly typeormReservationRepository: Repository<TypeOrmReservationEntity>,
  ) {}

  /** @inheritdoc */
  async findById(id: string): Promise<Reservation | null> {
    const entity = await this.typeormReservationRepository.findOneBy({ id });
    return entity ? ReservationMapper.toDomain(entity) : null;
  }

  /** @inheritdoc */
  async findPage(
    criteria: ReservationSearchCriteria,
  ): Promise<{ items: Reservation[]; total: number }> {
    const qb =
      this.typeormReservationRepository.createQueryBuilder('reservation');
    if (criteria.roomOwnerId) {
      qb.innerJoin('reservation.room', 'room').andWhere(
        'room.owner_id = :ownerId',
        { ownerId: criteria.roomOwnerId },
      );
    }
    if (criteria.userId) {
      qb.andWhere('reservation.user_id = :userId', { userId: criteria.userId });
    }
    if (criteria.roomId) {
      qb.andWhere('reservation.room_id = :roomId', { roomId: criteria.roomId });
    }
    if (criteria.status) {
      qb.andWhere('reservation.status = :status', { status: criteria.status });
    }
    if (criteria.startFrom) {
      qb.andWhere('reservation.start_at >= :startFrom', {
        startFrom: criteria.startFrom,
      });
    }
    if (criteria.startBefore) {
      qb.andWhere('reservation.start_at < :startBefore', {
        startBefore: criteria.startBefore,
      });
    }
    const [entities, total] = await qb
      .orderBy('reservation.start_at', 'DESC')
      .skip((criteria.page - 1) * criteria.pageSize)
      .take(criteria.pageSize)
      .getManyAndCount();
    return {
      items: entities.map((entity) => ReservationMapper.toDomain(entity)),
      total,
    };
  }

  /** @inheritdoc */
  async hasOverlap(
    roomId: string,
    startAt: Date,
    endAt: Date,
    excludedReservationId?: string,
  ): Promise<boolean> {
    const where: FindOptionsWhere<TypeOrmReservationEntity> = {
      roomId,
      status: In(ACTIVE_RESERVATION_STATUSES),
      startAt: LessThan(endAt),
      endAt: MoreThan(startAt),
    };
    if (excludedReservationId) where.id = Not(excludedReservationId);
    return this.typeormReservationRepository.exists({ where });
  }

  /** @inheritdoc */
  async save(reservation: Reservation): Promise<Reservation> {
    try {
      const saved = await this.typeormReservationRepository.save(
        ReservationMapper.toOrm(reservation),
      );
      // save ne relit pas les valeurs par défaut de la base (created_at) à la mise à jour
      return ReservationMapper.toDomain(
        await this.typeormReservationRepository.findOneByOrFail({
          id: saved.id,
        }),
      );
    } catch (error) {
      // Contrainte d'exclusion : une réservation active chevauche déjà ce créneau (course)
      if (isExclusionViolation(error)) {
        throw new ReservationConflictException('Créneau déjà réservé');
      }
      throw error;
    }
  }
}
