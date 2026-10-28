import { Inject, Injectable } from '@nestjs/common';
import {
  ROOM_REPOSITORY,
  type RoomRepositoryInterface,
} from '../../domain/repositories/room.repository.interface.js';
import { Room, RoomStatus } from '../../domain/entities/room.entity.js';

/** POST /rooms : ajoute une salle, au nom du gestionnaire ou de l'administrateur connecté. */
@Injectable()
export class CreateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY)
    private readonly roomRepository: RoomRepositoryInterface,
  ) {}

  /**
   * Crée la salle après vérification des règles du domaine.
   * @param name - Nom affiché de la salle.
   * @param description - Description libre, ou null.
   * @param capacity - Nombre maximal de personnes (au moins 1).
   * @param location - Lieu (ville, arrondissement…).
   * @param pricePerHour - Tarif horaire, positif ou nul.
   * @param equipment - Équipements proposés.
   * @param status - Statut initial (ACTIVE à la création par l'API).
   * @param imageUrl - URL de la photo, ou null.
   * @param ownerId - Gestionnaire propriétaire (l'utilisateur connecté).
   * @returns La salle enregistrée, avec son identifiant et sa date de création.
   * @throws {InvalidRoomException} Capacité inférieure à 1 ou prix négatif.
   */
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
