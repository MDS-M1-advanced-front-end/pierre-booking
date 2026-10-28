import { Inject, Injectable } from '@nestjs/common';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';
import { Room, RoomStatus } from '../../domain/entities/room.entity.js';

@Injectable()
export class CreateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  async execute(
    name: string,
    description: string | null,
    capacity: number,
    location: string,
    pricePerHour: number,
    equipment: string[],
    status: RoomStatus,
    imageUrl: string | null,
    ownerId: string,
  ): Promise<Room> {
    const room = new Room(
      undefined,
      name,
      description,
      capacity,
      location,
      pricePerHour,
      equipment,
      status,
      imageUrl,
      ownerId,
    );

    room.validate();

    return this.roomRepository.save(room);
  }
}
