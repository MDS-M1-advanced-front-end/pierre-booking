import { Inject, Injectable } from '@nestjs/common';
import { normalizeTime } from '../../../../common/paris-time.js';
import type { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import { RoomNotFoundException } from '../../domain/exceptions/room-domain.exception.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';
import { RoomAvailabilityService } from '../services/room-availability.service.js';

@Injectable()
export class GetRoomAvailabilityUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

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
