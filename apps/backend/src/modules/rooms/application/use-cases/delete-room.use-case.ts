import { Inject, Injectable } from '@nestjs/common';
import type { RoomActor } from '../../domain/entities/room.entity';
import {
  RoomAccessDeniedException,
  RoomNotFoundException,
} from '../../domain/exceptions/room-domain.exception';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface';

/** DELETE /rooms/{roomId} : supprime une salle sans réservation. */
@Injectable()
export class DeleteRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  /**
   * Supprime la salle si l'acteur la gère.
   * @param roomId - Salle à supprimer.
   * @param actor - Utilisateur connecté.
   * @throws {RoomNotFoundException} La salle n'existe pas.
   * @throws {RoomAccessDeniedException} L'acteur n'est ni le propriétaire ni un administrateur.
   * @throws {RoomHasReservationsException} Des réservations sont rattachées à la salle.
   */
  async execute(roomId: string, actor: RoomActor): Promise<void> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundException(roomId);
    if (!room.canBeManagedBy(actor)) throw new RoomAccessDeniedException();

    // RoomHasReservationsException (409) si des réservations y sont rattachées
    await this.roomRepository.delete(roomId);
  }
}
