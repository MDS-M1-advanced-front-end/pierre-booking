import { Inject, Injectable } from '@nestjs/common';
import { normalizeTime } from '../../../../common/paris-time';
import { Room, type RoomActor } from '../../domain/entities/room.entity';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
  type RoomSearchCriteria,
} from '../../domain/repositories/room.repository.interface';
import { RoomAvailabilityService } from '../services/room-availability.service';

/** Filtres de GET /rooms, déjà validés par le DTO. */
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

/** GET /rooms : recherche paginée des salles. */
@Injectable()
export class GetRoomsUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

  /**
   * Recherche les salles visibles par l'acteur : les salles actives, plus les salles inactives
   * qu'il gère (toutes pour un administrateur). Avec une date, seules les salles libres sur le
   * créneau sont gardées, sauf si `available` vaut false.
   * @param filters - Critères de recherche et pagination.
   * @param actor - Utilisateur connecté, ou undefined pour un visiteur.
   * @returns La page de salles et le nombre total de résultats.
   */
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
