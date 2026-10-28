import { Inject, Injectable } from '@nestjs/common';
import {
  Room,
  type RoomActor,
  type RoomChanges,
} from '../../domain/entities/room.entity.js';
import {
  RoomAccessDeniedException,
  RoomNotFoundException,
} from '../../domain/exceptions/room-domain.exception.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';

@Injectable()
export class UpdateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  async execute(
    roomId: string,
    changes: RoomChanges,
    actor: RoomActor,
  ): Promise<Room> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundException(roomId);
    if (!room.canBeManagedBy(actor)) throw new RoomAccessDeniedException();

    room.update(changes);

    return this.roomRepository.save(room);
  }
}
