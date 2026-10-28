import { Inject, Injectable } from '@nestjs/common';
import { RoomStatus } from '../../domain/entities/room.entity.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';
import { RoomAvailabilityService } from './room-availability.service.js';

/**
 * Ce que le module reservations lit des salles : exporté par RoomsModule et branché sur le port
 * ROOM_BOOKING de ce module.
 */
@Injectable()
export class RoomBookingService {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

  /**
   * Lit les informations d'une salle utiles à une réservation.
   * @param roomId - Salle à lire.
   * @returns Propriétaire, capacité, prix horaire et statut, ou null si la salle n'existe pas.
   */
  async findRoom(roomId: string): Promise<{
    id: string;
    ownerId: string;
    capacity: number;
    pricePerHour: number;
    isActive: boolean;
  } | null> {
    const room = await this.roomRepository.findById(roomId);
    return (
      room && {
        id: room.id!,
        ownerId: room.ownerId,
        capacity: room.capacity,
        pricePerHour: room.pricePerHour,
        isActive: room.status === RoomStatus.ACTIVE,
      }
    );
  }

  /**
   * Indique si le créneau est couvert par des disponibilités ouvertes de la salle.
   * @param roomId - Salle concernée.
   * @param startAt - Début du créneau (instant UTC).
   * @param endAt - Fin du créneau (instant UTC).
   * @returns true si le créneau est ouvert à la réservation.
   */
  isSlotOpen(roomId: string, startAt: Date, endAt: Date): Promise<boolean> {
    return this.roomAvailability.isOpen(roomId, startAt, endAt);
  }
}
