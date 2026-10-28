import { Room } from '../entities/room.entity.js';

export interface RoomSearchCriteria {
  search?: string;
  location?: string;
  capacityMin?: number;
  capacityMax?: number;
  // Restreint aux salles données (ex. salles libres sur un créneau)
  ids?: string[];
  // Salles inactives : toutes, celles d'un propriétaire, ou aucune
  inactive: 'all' | { ownerId: string } | 'none';
  page: number;
  pageSize: number;
}

export interface RoomRepositoryInterface {
  findPage(criteria: RoomSearchCriteria): Promise<{
    items: Room[];
    total: number;
  }>;
  findById(id: string): Promise<Room | null>;
  save(room: Room): Promise<Room>;
  // RoomHasReservationsException si des réservations y sont rattachées
  delete(id: string): Promise<void>;
}

export const ROOM_REPOSITORY = 'RoomRepositoryInterface';
