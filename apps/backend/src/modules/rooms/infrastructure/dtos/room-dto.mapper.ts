import type { Room } from '../../domain/entities/room.entity.js';
import type { RoomDTO } from './rooms.dto.js';

// Salle du domaine → réponse de l'API (schéma Room du contrat : champs vides omis)
export function toRoomDTO(room: Room): RoomDTO {
  return {
    id: room.id!,
    name: room.name,
    description: room.description ?? undefined,
    capacity: room.capacity,
    location: room.location,
    equipment: room.equipment,
    pricePerHour: room.pricePerHour,
    status: room.status,
    ownerId: room.ownerId,
    imageUrl: room.imageUrl ?? undefined,
    createdAt: room.createdAt?.toISOString(),
  };
}
