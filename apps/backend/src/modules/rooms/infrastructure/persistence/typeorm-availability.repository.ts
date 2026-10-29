import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { AvailabilitySlot } from '../../domain/entities/availability.entity';
import type { AvailabilityRepositoryInterface } from '../../domain/repositories/availability.repository.interface';
import { TypeOrmAvailabilityEntity } from './typeorm-availability.entity';

/**
 * Ligne de la table availabilities → créneau du domaine.
 * @param entity - Entité lue par TypeORM.
 * @returns Le créneau.
 */
const toDomain = (entity: TypeOrmAvailabilityEntity) =>
  new AvailabilitySlot(
    entity.roomId,
    entity.date,
    entity.startTime,
    entity.endTime,
    entity.isAvailable,
  );

/** Implémentation TypeORM de {@link AvailabilityRepositoryInterface}. */
@Injectable()
export class TypeormAvailabilityRepository implements AvailabilityRepositoryInterface {
  constructor(
    @InjectRepository(TypeOrmAvailabilityEntity)
    private readonly typeormAvailabilityRepository: Repository<TypeOrmAvailabilityEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Lit les créneaux d'une salle pour une journée.
   * @param roomId - Salle concernée.
   * @param date - Jour au format YYYY-MM-DD.
   * @returns Les créneaux, triés par heure de début.
   */
  async findByRoomAndDate(
    roomId: string,
    date: string,
  ): Promise<AvailabilitySlot[]> {
    const entities = await this.typeormAvailabilityRepository.find({
      where: { roomId, date },
      order: { startTime: 'ASC' },
    });
    return entities.map(toDomain);
  }

  /**
   * Créneaux ouverts de la date qui contiennent les heures données, toutes salles confondues.
   * @param criteria - Jour (YYYY-MM-DD) et heures (HH:mm:ss) à contenir.
   * @returns Les créneaux correspondants.
   */
  async findOpenSlots(criteria: {
    date: string;
    startTime?: string;
    endTime?: string;
  }): Promise<AvailabilitySlot[]> {
    const { date, startTime, endTime } = criteria;
    const where: FindOptionsWhere<TypeOrmAvailabilityEntity> = {
      date,
      isAvailable: true,
    };
    if (startTime) {
      where.startTime = LessThanOrEqual(startTime);
      where.endTime = MoreThan(startTime);
    }
    if (endTime) {
      where.endTime = MoreThanOrEqual(endTime);
      if (!startTime) where.startTime = LessThan(endTime);
    }
    const entities = await this.typeormAvailabilityRepository.find({ where });
    return entities.map(toDomain);
  }

  /**
   * Supprime puis recrée les créneaux de la journée, dans une transaction.
   * @param roomId - Salle concernée.
   * @param date - Jour au format YYYY-MM-DD.
   * @param slots - Nouveaux créneaux.
   * @returns Les créneaux enregistrés.
   */
  async replaceDay(
    roomId: string,
    date: string,
    slots: AvailabilitySlot[],
  ): Promise<AvailabilitySlot[]> {
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.delete(TypeOrmAvailabilityEntity, { roomId, date });
      return manager.save(
        slots.map((slot) =>
          manager.create(TypeOrmAvailabilityEntity, {
            roomId,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable,
          }),
        ),
      );
    });
    return saved.map(toDomain);
  }
}
