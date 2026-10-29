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
import { ACTIVE_RESERVATION_STATUSES } from '../../../reservations/domain/entities/reservation.entity';
import { TypeOrmReservationEntity } from '../../../reservations/infrastructure/persistence/typeorm-reservation.entity';
import type {
  Occupancy,
  RoomOccupancyPort,
} from '../../application/ports/room-occupancy.port';

/**
 * Implémentation de {@link RoomOccupancyPort}. Lit la table des réservations directement (lecture
 * seule) : passer par le module reservations créerait une dépendance circulaire, puisqu'il dépend
 * déjà de ce module.
 */
@Injectable()
export class TypeormRoomOccupancyAdapter implements RoomOccupancyPort {
  constructor(
    @InjectRepository(TypeOrmReservationEntity)
    private readonly reservations: Repository<TypeOrmReservationEntity>,
  ) {}

  /**
   * Liste les réservations PENDING ou CONFIRMED des salles qui chevauchent [from, to[.
   * @param roomIds - Salles concernées ; liste vide : aucun résultat, sans requête.
   * @param from - Début de l'intervalle (inclus).
   * @param to - Fin de l'intervalle (exclue).
   * @param excludedReservationId - Réservation à ignorer.
   * @returns Les périodes occupées.
   */
  async findOccupied(
    roomIds: string[],
    from: Date,
    to: Date,
    excludedReservationId?: string,
  ): Promise<Occupancy[]> {
    if (roomIds.length === 0) return [];
    const where: FindOptionsWhere<TypeOrmReservationEntity> = {
      roomId: In(roomIds),
      status: In(ACTIVE_RESERVATION_STATUSES),
      startAt: LessThan(to),
      endAt: MoreThan(from),
    };
    if (excludedReservationId) where.id = Not(excludedReservationId);
    const entities = await this.reservations.find({
      where,
      select: { roomId: true, startAt: true, endAt: true },
    });
    return entities.map(({ roomId, startAt, endAt }) => ({
      roomId,
      startAt,
      endAt,
    }));
  }
}
