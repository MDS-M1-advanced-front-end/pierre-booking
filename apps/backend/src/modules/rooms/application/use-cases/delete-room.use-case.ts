import { Inject, Injectable } from '@nestjs/common';
import type { RoomActor } from '../../domain/entities/room.entity.js';
import {
  RoomAccessDeniedException,
  RoomNotFoundException,
} from '../../domain/exceptions/room-domain.exception.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';

@Injectable()
export class DeleteRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  async execute(roomId: string, actor: RoomActor): Promise<void> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundException(roomId);
    if (!room.canBeManagedBy(actor)) throw new RoomAccessDeniedException();

    // RoomHasReservationsException (409) si des réservations y sont rattachées
    await this.roomRepository.delete(roomId);
  }
}
