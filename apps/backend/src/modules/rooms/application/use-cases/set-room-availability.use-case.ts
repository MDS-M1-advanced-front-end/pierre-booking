import { Inject, Injectable } from '@nestjs/common';
import { normalizeTime } from '../../../../common/paris-time.js';
import { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import type { RoomActor } from '../../domain/entities/room.entity.js';
import {
  RoomAccessDeniedException,
  RoomNotFoundException,
} from '../../domain/exceptions/room-domain.exception.js';
import {
  AVAILABILITY_REPOSITORY,
  type AvailabilityRepositoryInterface,
} from '../../domain/repositories/availability.repository.interface.js';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';

/** PUT /rooms/{roomId}/availability : définit les créneaux d'une salle pour une journée. */
@Injectable()
export class SetRoomAvailabilityUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepositoryInterface,
  ) {}

  /**
   * Remplace tous les créneaux de la date.
   * @param roomId - Salle concernée.
   * @param date - Jour au format YYYY-MM-DD (heure de Paris).
   * @param slots - Nouveaux créneaux (heures HH:mm ou HH:mm:ss) ; liste vide : journée fermée.
   * @param actor - Utilisateur connecté.
   * @returns Les créneaux enregistrés, triés par heure de début.
   * @throws {RoomNotFoundException} La salle n'existe pas.
   * @throws {RoomAccessDeniedException} L'acteur n'est ni le propriétaire ni un administrateur.
   * @throws {InvalidRoomException} Un créneau finit avant de commencer, ou deux créneaux se chevauchent.
   */
  async execute(
    roomId: string,
    date: string,
    slots: { startTime: string; endTime: string; available: boolean }[],
    actor: RoomActor,
  ): Promise<AvailabilitySlot[]> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundException(roomId);
    if (!room.canBeManagedBy(actor)) throw new RoomAccessDeniedException();

    const day = slots
      .map(
        (slot) =>
          new AvailabilitySlot(
            roomId,
            date,
            normalizeTime(slot.startTime),
            normalizeTime(slot.endTime),
            slot.available,
          ),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    AvailabilitySlot.assertValidDay(day);

    return this.availabilityRepository.replaceDay(roomId, date, day);
  }
}
