import { Inject, Injectable } from '@nestjs/common';
import { addDays, fromParis, toParis } from '../../../../common/paris-time.js';
import { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import {
  AVAILABILITY_REPOSITORY,
  type AvailabilityRepositoryInterface,
} from '../../domain/repositories/availability.repository.interface.js';
import {
  ROOM_OCCUPANCY,
  type Occupancy,
  type RoomOccupancyPort,
} from '../ports/room-occupancy.port.js';

// Croise les créneaux ouverts et l'occupation par les réservations (heure de Paris ↔ UTC)
@Injectable()
export class RoomAvailabilityService {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepositoryInterface,
    @Inject(ROOM_OCCUPANCY) private readonly occupancy: RoomOccupancyPort,
  ) {}

  // Créneaux de la journée, « disponible » = ouvert et sans réservation active dessus
  async daySlots(
    roomId: string,
    date: string,
    startTime?: string,
    endTime?: string,
  ): Promise<{ slot: AvailabilitySlot; available: boolean }[]> {
    const slots = (
      await this.availabilityRepository.findByRoomAndDate(roomId, date)
    ).filter(
      (slot) =>
        (!startTime || slot.endTime > startTime) &&
        (!endTime || slot.startTime < endTime),
    );
    const occupied = await this.occupancy.findOccupied(
      [roomId],
      fromParis(date),
      fromParis(addDays(date, 1)),
    );
    return slots.map((slot) => ({
      slot,
      available: slot.isAvailable && !this.isOccupied(slot, occupied),
    }));
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
    const slots = await this.availabilityRepository.findOpenSlots({
      date,
      startTime,
      endTime,
    });
    if (slots.length === 0) return [];
    const occupied = await this.occupancy.findOccupied(
      [...new Set(slots.map((slot) => slot.roomId))],
      fromParis(date),
      fromParis(addDays(date, 1)),
    );
    const free = slots.filter(
      (slot) => !this.isOccupied(slot, occupied, startTime, endTime),
    );
    return [...new Set(free.map((slot) => slot.roomId))];
  }

  // [startAt, endAt[ tient-il dans une journée (heure de Paris), couvert par des créneaux ouverts ?
  async isOpen(roomId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const start = toParis(startAt);
    const end = toParis(endAt);
    // Fin à minuit le lendemain : 24:00:00 du jour de début
    const endTime =
      end.date === start.date
        ? end.time
        : end.date === addDays(start.date, 1) && end.time === '00:00:00'
          ? '24:00:00'
          : null;
    if (!endTime) return false;
    const slots = await this.availabilityRepository.findByRoomAndDate(
      roomId,
      start.date,
    );
    return AvailabilitySlot.cover(slots, start.time, endTime);
  }

  // Une réservation de la salle chevauche-t-elle le créneau, réduit à la plage demandée ?
  private isOccupied(
    slot: AvailabilitySlot,
    occupied: Occupancy[],
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
    return occupied.some(
      (period) =>
        period.roomId === slot.roomId &&
        period.startAt < to &&
        period.endAt > from,
    );
  }
}
