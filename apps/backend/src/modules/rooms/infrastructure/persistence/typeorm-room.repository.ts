import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { isForeignKeyViolation } from '../../../../common/database-errors.js';
import { Room, RoomStatus } from '../../domain/entities/room.entity.js';
import { RoomHasReservationsException } from '../../domain/exceptions/room-domain.exception.js';
import type {
  RoomRepositoryInterface,
  RoomSearchCriteria,
} from '../../domain/repositories/room.repository.interface.js';
import { RoomMapper } from './room.mapper.js';
import { TypeOrmRoomEntity } from './typeorm-room.entity.js';

/** Implémentation TypeORM de {@link RoomRepositoryInterface}. */
@Injectable()
export class TypeormRoomRepository implements RoomRepositoryInterface {
  constructor(
    @InjectRepository(TypeOrmRoomEntity)
    private readonly typeormRoomRepository: Repository<TypeOrmRoomEntity>,
  ) {}

  /**
   * Recherche paginée, triée par nom : visibilité des salles inactives, liste d'identifiants,
   * texte (nom ou description), lieu et capacité.
   * @param criteria - Critères de recherche.
   * @returns La page de salles et le nombre total de résultats.
   */
  async findPage(
    criteria: RoomSearchCriteria,
  ): Promise<{ items: Room[]; total: number }> {
    const qb = this.typeormRoomRepository.createQueryBuilder('room');

    const { inactive } = criteria;
    if (inactive !== 'all') {
      qb.andWhere(
        new Brackets((where) => {
          where.where('room.status = :active', { active: RoomStatus.ACTIVE });
          if (inactive !== 'none') {
            where.orWhere('room.owner_id = :ownerId', {
              ownerId: inactive.ownerId,
            });
          }
        }),
      );
    }
    if (criteria.ids) qb.andWhereInIds(criteria.ids);
    if (criteria.search) {
      qb.andWhere(
        '(room.name ILIKE :search OR room.description ILIKE :search)',
        { search: `%${criteria.search}%` },
      );
    }
    if (criteria.location) {
      qb.andWhere('room.location ILIKE :location', {
        location: `%${criteria.location}%`,
      });
    }
    if (criteria.capacityMin) {
      qb.andWhere('room.capacity >= :capacityMin', {
        capacityMin: criteria.capacityMin,
      });
    }
    if (criteria.capacityMax) {
      qb.andWhere('room.capacity <= :capacityMax', {
        capacityMax: criteria.capacityMax,
      });
    }

    const [entities, total] = await qb
      .orderBy('room.name', 'ASC')
      .skip((criteria.page - 1) * criteria.pageSize)
      .take(criteria.pageSize)
      .getManyAndCount();
    return {
      items: entities.map((entity) => RoomMapper.toDomain(entity)),
      total,
    };
  }

  /**
   * Lit une salle.
   * @param id - Identifiant de la salle.
   * @returns La salle, ou null si elle n'existe pas.
   */
  async findById(id: string): Promise<Room | null> {
    const entity = await this.typeormRoomRepository.findOneBy({ id });
    return entity ? RoomMapper.toDomain(entity) : null;
  }

  /**
   * Insère ou met à jour la salle, puis la relit (created_at n'est pas renvoyé par une mise à jour).
   * @param room - Salle à enregistrer.
   * @returns La salle enregistrée.
   */
  async save(room: Room): Promise<Room> {
    const ormEntity = RoomMapper.toOrm(room);
    const savedEntity = await this.typeormRoomRepository.save(ormEntity);
    // save ne relit pas les valeurs par défaut de la base (created_at) à la mise à jour
    const reloaded = await this.typeormRoomRepository.findOneByOrFail({
      id: savedEntity.id,
    });
    return RoomMapper.toDomain(reloaded);
  }

  /**
   * Supprime une salle ; ses disponibilités partent en cascade.
   * @param id - Identifiant de la salle.
   * @throws {RoomHasReservationsException} Des réservations sont rattachées à la salle.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.typeormRoomRepository.delete(id);
    } catch (error) {
      // ON DELETE RESTRICT sur reservations.room_id
      if (isForeignKeyViolation(error)) {
        throw new RoomHasReservationsException();
      }
      throw error;
    }
  }
}
