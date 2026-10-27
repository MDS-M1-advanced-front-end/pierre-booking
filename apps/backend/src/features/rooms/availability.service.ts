import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThan,
  MoreThan,
  Not,
  Repository,
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
import type { Room } from '../../models/rooms.model.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { ACTIVE_RESERVATION_STATUSES } from '../reservations/reservations.constants.js';
import { assertCanManageRoom } from './rooms.access.js';
import type {
  AvailabilityQueryDTO,
  AvailabilitySlotDTO,
  UpdateAvailabilityDTO,
} from './rooms.dto.js';
import { toAvailabilitySlotDTO } from './rooms.mapper.js';
import { RoomsService } from './rooms.service.js';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilities: Repository<Availability>,
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly roomsService: RoomsService,
  ) {}

  // Un créneau est disponible s'il est ouvert et qu'aucune réservation active ne le chevauche
  async find(
    roomId: string,
    query: AvailabilityQueryDTO,
  ): Promise<AvailabilitySlotDTO[]> {
    await this.roomsService.getOrFail(roomId);
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

    return slots.map((slot) => {
      const slotStart = fromParis(slot.date, slot.startTime);
      const slotEnd = fromParis(slot.date, slot.endTime);
      const reserved = reservations.some(
        (reservation) =>
          reservation.startAt < slotEnd && reservation.endAt > slotStart,
      );
      return toAvailabilitySlotDTO(slot, slot.isAvailable && !reserved);
    });
  }

  // Remplace tous les créneaux de la date
  async replace(
    roomId: string,
    body: UpdateAvailabilityDTO,
    user: AuthUser,
  ): Promise<AvailabilitySlotDTO[]> {
    const room = await this.roomsService.getOrFail(roomId);
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

  private findOverlapping(
    roomId: string,
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
