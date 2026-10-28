import { Inject, Injectable } from '@nestjs/common';
import { Room, type RoomActor } from '../../domain/entities/room.entity.js';
import { RoomNotFoundException } from '../../domain/exceptions/room-domain.exception.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';

/** GET /rooms/{roomId} : détails d'une salle. */
@Injectable()
export class GetRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  /**
   * Lit une salle visible par l'acteur : une salle inactive est introuvable pour qui ne la gère pas.
   * @param roomId - Salle à lire.
   * @param actor - Utilisateur connecté, ou undefined pour un visiteur.
   * @returns La salle.
   * @throws {RoomNotFoundException} La salle n'existe pas ou n'est pas visible par l'acteur.
   */
  async execute(roomId: string, actor?: RoomActor): Promise<Room> {
    const room = await this.roomRepository.findById(roomId);
    // Une salle inactive est introuvable pour qui ne la gère pas
    if (!room || !room.isVisibleTo(actor)) {
      throw new RoomNotFoundException(roomId);
    }
    return room;
  }
}
