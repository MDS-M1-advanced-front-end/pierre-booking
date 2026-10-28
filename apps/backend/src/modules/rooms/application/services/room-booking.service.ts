import { Inject, Injectable } from '@nestjs/common';
import { RoomStatus } from '../../domain/entities/room.entity.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';
import { RoomAvailabilityService } from './room-availability.service.js';

// Ce que le module reservations lit des salles (exporté par RoomsModule, branché sur son port)
@Injectable()
export class RoomBookingService {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

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

  isSlotOpen(roomId: string, startAt: Date, endAt: Date): Promise<boolean> {
    return this.roomAvailability.isOpen(roomId, startAt, endAt);
  }
}
