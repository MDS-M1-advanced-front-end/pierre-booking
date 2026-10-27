import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { isForeignKeyViolation } from '../../common/database-errors.js';
import { toSkipTake } from '../../common/pagination.dto.js';
import { normalizeTime } from '../../common/paris-time.js';
import { Room } from '../../models/rooms.model.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { ACTIVE_RESERVATION_STATUSES } from '../reservations/reservations.constants.js';
import { UserRole } from '../users/users.dto.js';
import { assertCanManageRoom, canManageRoom } from './rooms.access.js';
import {
  RoomStatus,
  type CreateRoomDTO,
  type PaginatedRoomsDTO,
  type RoomDTO,
  type RoomsQueryDTO,
  type UpdateRoomDTO,
} from './rooms.dto.js';
import { toRoomDTO } from './rooms.mapper.js';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  async findAll(
    query: RoomsQueryDTO,
    user?: AuthUser,
  ): Promise<PaginatedRoomsDTO> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const qb = this.rooms.createQueryBuilder('room');

    // Salles inactives : visibles seulement par leur gestionnaire et les administrateurs
    if (user?.role !== UserRole.ADMINISTRATEUR) {
      qb.andWhere(
        new Brackets((where) => {
          where.where('room.status = :active', { active: RoomStatus.ACTIVE });
          if (user)
            where.orWhere('room.owner_id = :userId', { userId: user.id });
        }),
      );
    }
    if (query.search) {
      qb.andWhere(
        '(room.name ILIKE :search OR room.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.location) {
      qb.andWhere('room.location ILIKE :location', {
        location: `%${query.location}%`,
      });
    }
    if (query.capacityMin) {
      qb.andWhere('room.capacity >= :capacityMin', {
        capacityMin: query.capacityMin,
      });
    }
    if (query.capacityMax) {
      qb.andWhere('room.capacity <= :capacityMax', {
        capacityMax: query.capacityMax,
      });
    }
    if (query.date && query.available !== false) {
      this.whereAvailable(qb, query);
    }

    const [rooms, total] = await qb
      .orderBy('room.name', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return { items: rooms.map(toRoomDTO), page, pageSize, total };
  }

  // Un créneau disponible à la date, qui couvre la plage demandée et n'est pas déjà réservé
  private whereAvailable(
    qb: ReturnType<Repository<Room>['createQueryBuilder']>,
    query: RoomsQueryDTO,
  ): void {
    const startTime = query.startTime ? normalizeTime(query.startTime) : null;
    const endTime = query.endTime ? normalizeTime(query.endTime) : null;
    const from = startTime
      ? 'GREATEST(slot.start_time, CAST(:startTime AS time))'
      : 'slot.start_time';
    const to = endTime
      ? 'LEAST(slot.end_time, CAST(:endTime AS time))'
      : 'slot.end_time';

    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM availabilities slot
        WHERE slot.room_id = room.id
          AND slot.date = :date
          AND slot.is_available
          ${startTime ? 'AND slot.start_time <= CAST(:startTime AS time) AND slot.end_time > CAST(:startTime AS time)' : ''}
          ${endTime ? 'AND slot.end_time >= CAST(:endTime AS time) AND slot.start_time < CAST(:endTime AS time)' : ''}
          AND NOT EXISTS (
            SELECT 1 FROM reservations reservation
            WHERE reservation.room_id = room.id
              AND reservation.status IN (:...activeStatuses)
              AND reservation.start_at < (slot.date + ${to}) AT TIME ZONE 'Europe/Paris'
              AND reservation.end_at > (slot.date + ${from}) AT TIME ZONE 'Europe/Paris'
          )
      )`,
      {
        date: query.date,
        startTime,
        endTime,
        activeStatuses: ACTIVE_RESERVATION_STATUSES,
      },
    );
  }

  async findOne(roomId: string, user?: AuthUser): Promise<RoomDTO> {
    const room = await this.getOrFail(roomId);
    if (room.status !== RoomStatus.ACTIVE && !canManageRoom(room, user)) {
      throw new NotFoundException('Salle introuvable');
    }
    return toRoomDTO(room);
  }

  async create(body: CreateRoomDTO, user: AuthUser): Promise<RoomDTO> {
    const room = this.rooms.create(body);
    room.ownerId = user.id;
    return toRoomDTO(await this.rooms.save(room));
  }

  async update(
    roomId: string,
    body: UpdateRoomDTO,
    user: AuthUser,
  ): Promise<RoomDTO> {
    const room = await this.getOrFail(roomId);
    assertCanManageRoom(room, user);
    Object.assign(room, body);
    return toRoomDTO(await this.rooms.save(room));
  }

  async remove(roomId: string, user: AuthUser): Promise<void> {
    const room = await this.getOrFail(roomId);
    assertCanManageRoom(room, user);
    try {
      await this.rooms.remove(room);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'La salle a des réservations, elle ne peut pas être supprimée',
        );
      }
      throw error;
    }
  }

  async getOrFail(roomId: string): Promise<Room> {
    const room = await this.rooms.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Salle introuvable');
    return room;
  }
}
