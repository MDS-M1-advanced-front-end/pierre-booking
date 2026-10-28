import { Inject, Injectable } from '@nestjs/common';
import { normalizeTime } from '../../../../common/paris-time.js';
import type { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import { RoomNotFoundException } from '../../domain/exceptions/room-domain.exception.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';
import { RoomAvailabilityService } from '../services/room-availability.service.js';

/** GET /rooms/{roomId}/availability : créneaux d'une salle pour une journée. */
@Injectable()
export class GetRoomAvailabilityUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

  /**
   * Liste les créneaux de la journée avec leur disponibilité réelle (ouverts et non réservés).
   * @param roomId - Salle concernée.
   * @param date - Jour au format YYYY-MM-DD (heure de Paris).
   * @param startTime - Filtre : créneaux qui finissent après cette heure (HH:mm ou HH:mm:ss).
   * @param endTime - Filtre : créneaux qui commencent avant cette heure (HH:mm ou HH:mm:ss).
   * @returns Chaque créneau et son statut « disponible ».
   * @throws {RoomNotFoundException} La salle n'existe pas.
   */
  async execute(
    roomId: string,
    date: string,
    startTime?: string,
    endTime?: string,
  ): Promise<{ slot: AvailabilitySlot; available: boolean }[]> {
    if (!(await this.roomRepository.findById(roomId))) {
      throw new RoomNotFoundException(roomId);
    }
    return this.roomAvailability.daySlots(
      roomId,
      date,
      startTime && normalizeTime(startTime),
      endTime && normalizeTime(endTime),
    );
  }
}
