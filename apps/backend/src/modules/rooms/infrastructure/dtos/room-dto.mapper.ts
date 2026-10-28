import type { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import type { Room } from '../../domain/entities/room.entity.js';
import type { AvailabilitySlotDTO, RoomDTO } from './rooms.dto.js';

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

export function toAvailabilitySlotDTO(
  slot: AvailabilitySlot,
  available = slot.isAvailable,
): AvailabilitySlotDTO {
  return { startTime: slot.startTime, endTime: slot.endTime, available };
}
