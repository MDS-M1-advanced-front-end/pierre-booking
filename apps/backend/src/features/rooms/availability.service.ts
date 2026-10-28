import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
  type FindOperator,
  type FindOptionsWhere,
} from 'typeorm';
import {
  addDays,
  fromParis,
  normalizeTime,
  toParis,
} from '../../common/paris-time.js';
import { Availability } from '../../models/availabilities.model.js';
import { Reservation } from '../../models/reservations.model.js';
import { TypeOrmRoomEntity as Room } from '../../modules/rooms/infrastructure/persistence/typeorm-room.entity.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { ACTIVE_RESERVATION_STATUSES } from '../reservations/reservations.constants.js';
import { assertCanManageRoom } from './rooms.access.js';
import type {
  AvailabilityQueryDTO,
  AvailabilitySlotDTO,
  UpdateAvailabilityDTO,
} from '../../modules/rooms/infrastructure/dtos/rooms.dto.js';
import { toAvailabilitySlotDTO } from './rooms.mapper.js';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilities: Repository<Availability>,
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
    // Pas de RoomsService ici : il dépend de ce service (findFreeRoomIds)
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Un créneau est disponible s'il est ouvert et qu'aucune réservation active ne le chevauche
  async find(
    roomId: string,
    query: AvailabilityQueryDTO,
  ): Promise<AvailabilitySlotDTO[]> {
    await this.getRoomOrFail(roomId);
    const startTime = query.startTime && normalizeTime(query.startTime);
    const endTime = query.endTime && normalizeTime(query.endTime);

    const slots = (
      await this.availabilities.find({
        where: { roomId, date: query.date },
        order: { startTime: 'ASC' },
      })
    ).filter(
      (slot) =>
        (!startTime || slot.endTime > startTime) &&
        (!endTime || slot.startTime < endTime),
    );
    const reservations = await this.findOverlapping(
      roomId,
      fromParis(query.date),
      fromParis(addDays(query.date, 1)),
    );

    return slots.map((slot) =>
      toAvailabilitySlotDTO(
        slot,
        slot.isAvailable && !this.isReserved(slot, reservations),
      ),
    );
  }

  /**
   * Salles libres à la date : un créneau ouvert couvre la plage [startTime, endTime]
   * (ou contient l'heure donnée, ou existe simplement) et aucune réservation active ne la chevauche.
   */
  async findFreeRoomIds(
    date: string,
    startTime?: string,
    endTime?: string,
  ): Promise<string[]> {
    const where: FindOptionsWhere<Availability> = { date, isAvailable: true };
    if (startTime) {
      where.startTime = LessThanOrEqual(startTime);
      where.endTime = MoreThan(startTime);
    }
    if (endTime) {
      where.endTime = MoreThanOrEqual(endTime);
      if (!startTime) where.startTime = LessThan(endTime);
    }
    const slots = await this.availabilities.find({ where });
    if (slots.length === 0) return [];

    const reservations = await this.findOverlapping(
      In(slots.map((slot) => slot.roomId)),
      fromParis(date),
      fromParis(addDays(date, 1)),
    );
    const freeSlots = slots.filter(
      (slot) => !this.isReserved(slot, reservations, startTime, endTime),
    );
    return [...new Set(freeSlots.map((slot) => slot.roomId))];
  }

  // Remplace tous les créneaux de la date
  async replace(
    roomId: string,
    body: UpdateAvailabilityDTO,
    user: AuthUser,
  ): Promise<AvailabilitySlotDTO[]> {
    const room = await this.getRoomOrFail(roomId);
    assertCanManageRoom(room, user);

    const slots = body.slots
      .map((slot) => ({
        available: slot.available,
        startTime: normalizeTime(slot.startTime),
        endTime: normalizeTime(slot.endTime),
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    slots.forEach((slot, index) => {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          `Créneau ${slot.startTime}-${slot.endTime} : début après la fin`,
        );
      }
      const previous = slots[index - 1];
      if (previous && previous.endTime > slot.startTime) {
        throw new BadRequestException('Des créneaux se chevauchent');
      }
    });

    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.delete(Availability, { roomId, date: body.date });
      return manager.save(
        slots.map((slot) =>
          manager.create(Availability, {
            roomId,
            date: body.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.available,
          }),
        ),
      );
    });
    return saved.map((slot) => toAvailabilitySlotDTO(slot));
  }

  /**
   * Vérifie qu'une réservation peut occuper [startAt, endAt[ :
   * couverte par des créneaux ouverts du même jour (heure de Paris), sans chevaucher une autre réservation.
   */
  async assertBookable(
    room: Room,
    startAt: Date,
    endAt: Date,
    excludedReservationId?: string,
  ): Promise<void> {
    const start = toParis(startAt);
    const end = toParis(endAt);
    const endTime =
      end.date === addDays(start.date, 1) && end.time === '00:00:00'
        ? '24:00:00'
        : end.time;
    if (end.date !== start.date && endTime !== '24:00:00') {
      throw new BadRequestException(
        'Une réservation doit tenir sur une seule journée',
      );
    }

    const slots = await this.availabilities.find({
      where: { roomId: room.id, date: start.date, isAvailable: true },
      order: { startTime: 'ASC' },
    });
    // Parcours des créneaux contigus depuis l'heure de début
    let coveredUntil = start.time;
    for (const slot of slots) {
      if (slot.startTime <= coveredUntil && slot.endTime > coveredUntil) {
        coveredUntil = slot.endTime;
      }
    }
    if (coveredUntil < endTime) {
      throw new ConflictException('Créneau indisponible');
    }

    const overlapping = await this.findOverlapping(
      room.id,
      startAt,
      endAt,
      excludedReservationId,
    );
    if (overlapping.length > 0) {
      throw new ConflictException('Créneau déjà réservé');
    }
  }

  // Une réservation de la salle du créneau chevauche-t-elle le créneau, réduit à la plage demandée ?
  private isReserved(
    slot: Availability,
    reservations: Reservation[],
    startTime = slot.startTime,
    endTime = slot.endTime,
  ): boolean {
    const from = fromParis(
      slot.date,
      startTime > slot.startTime ? startTime : slot.startTime,
    );
    const to = fromParis(
      slot.date,
      endTime < slot.endTime ? endTime : slot.endTime,
    );
    return reservations.some(
      (reservation) =>
        reservation.roomId === slot.roomId &&
        reservation.startAt < to &&
        reservation.endAt > from,
    );
  }

  private async getRoomOrFail(roomId: string): Promise<Room> {
    const room = await this.rooms.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Salle introuvable');
    return room;
  }

  private findOverlapping(
    roomId: string | FindOperator<string>,
    from: Date,
    to: Date,
    excludedReservationId?: string,
  ): Promise<Reservation[]> {
    const where: FindOptionsWhere<Reservation> = {
      roomId,
      status: In(ACTIVE_RESERVATION_STATUSES),
      startAt: LessThan(to),
      endAt: MoreThan(from),
    };
    if (excludedReservationId) where.id = Not(excludedReservationId);
    return this.reservations.find({ where });
  }
}
