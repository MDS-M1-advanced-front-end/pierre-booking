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

/** PATCH /rooms/{roomId} : modification partielle d'une salle. */
@Injectable()
export class UpdateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  /**
   * Applique les champs fournis à la salle, si l'acteur la gère.
   * @param roomId - Salle à modifier.
   * @param changes - Champs à modifier ; null efface description et imageUrl.
   * @param actor - Utilisateur connecté.
   * @returns La salle modifiée.
   * @throws {RoomNotFoundException} La salle n'existe pas.
   * @throws {RoomAccessDeniedException} L'acteur n'est ni le propriétaire ni un administrateur.
   * @throws {InvalidRoomException} Capacité inférieure à 1 ou prix négatif après modification.
   */
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
