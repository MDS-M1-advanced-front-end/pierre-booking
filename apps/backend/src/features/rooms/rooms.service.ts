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
import { UserRole } from '../users/users.dto.js';
import { AvailabilityService } from './availability.service.js';
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
    private readonly availabilityService: AvailabilityService,
  ) {}

  async findAll(
    query: RoomsQueryDTO,
    user?: AuthUser,
  ): Promise<PaginatedRoomsDTO> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const qb = this.rooms.createQueryBuilder('room');

    if (query.date && query.available !== false) {
      const freeRoomIds = await this.availabilityService.findFreeRoomIds(
        query.date,
        query.startTime && normalizeTime(query.startTime),
        query.endTime && normalizeTime(query.endTime),
      );
      if (freeRoomIds.length === 0)
        return { items: [], page, pageSize, total: 0 };
      qb.andWhereInIds(freeRoomIds);
    }

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

    const [rooms, total] = await qb
      .orderBy('room.name', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return { items: rooms.map(toRoomDTO), page, pageSize, total };
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
