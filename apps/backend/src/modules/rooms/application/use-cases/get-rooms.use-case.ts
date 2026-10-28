import { Inject, Injectable } from '@nestjs/common';
import { normalizeTime } from '../../../../common/paris-time.js';
import { Room, type RoomActor } from '../../domain/entities/room.entity.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
  type RoomSearchCriteria,
} from '../../domain/repositories/room.repository.interface.js';
import { RoomAvailabilityService } from '../services/room-availability.service.js';

export interface GetRoomsFilters {
  search?: string;
  location?: string;
  capacityMin?: number;
  capacityMax?: number;
  // Créneau recherché (heure de Paris) : salles libres seulement, sauf available === false
  date?: string;
  startTime?: string;
  endTime?: string;
  available?: boolean;
  page: number;
  pageSize: number;
}

@Injectable()
export class GetRoomsUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

  async execute(
    filters: GetRoomsFilters,
    actor?: RoomActor,
  ): Promise<{ items: Room[]; total: number }> {
    let ids: string[] | undefined;
    if (filters.date && filters.available !== false) {
      ids = await this.roomAvailability.findFreeRoomIds(
        filters.date,
        filters.startTime && normalizeTime(filters.startTime),
        filters.endTime && normalizeTime(filters.endTime),
      );
      if (ids.length === 0) return { items: [], total: 0 };
    }

    const criteria: RoomSearchCriteria = {
      search: filters.search,
      location: filters.location,
      capacityMin: filters.capacityMin,
      capacityMax: filters.capacityMax,
      ids,
      // Même règle que Room.isVisibleTo, appliquée par la requête
      inactive: actor?.isAdmin ? 'all' : actor ? { ownerId: actor.id } : 'none',
      page: filters.page,
      pageSize: filters.pageSize,
    };
    return this.roomRepository.findPage(criteria);
  }
}
