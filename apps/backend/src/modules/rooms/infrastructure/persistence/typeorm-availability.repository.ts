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
import { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import type { AvailabilityRepositoryInterface } from '../../domain/repositories/availability.repository.interface.js';
import { TypeOrmAvailabilityEntity } from './typeorm-availability.entity.js';

const toDomain = (entity: TypeOrmAvailabilityEntity) =>
  new AvailabilitySlot(
    entity.roomId,
    entity.date,
    entity.startTime,
    entity.endTime,
    entity.isAvailable,
  );

@Injectable()
export class TypeormAvailabilityRepository implements AvailabilityRepositoryInterface {
  constructor(
    @InjectRepository(TypeOrmAvailabilityEntity)
    private readonly typeormAvailabilityRepository: Repository<TypeOrmAvailabilityEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

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
