import type { AvailabilitySlot } from '../../domain/entities/availability.entity.js';
import type { Room } from '../../domain/entities/room.entity.js';
import type { AvailabilitySlotDTO, RoomDTO } from './rooms.dto.js';

/**
 * Salle du domaine → réponse de l'API (schéma Room du contrat : champs vides omis).
 * @param room - Salle enregistrée (avec identifiant).
 * @returns Le corps de réponse.
 */
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

/**
 * Créneau du domaine → réponse de l'API (schéma AvailabilitySlot du contrat).
 * @param slot - Créneau.
 * @param available - Disponibilité à afficher ; par défaut, le créneau est-il ouvert.
 * @returns Le corps de réponse.
 */
export function toAvailabilitySlotDTO(
  slot: AvailabilitySlot,
  available = slot.isAvailable,
): AvailabilitySlotDTO {
  return { startTime: slot.startTime, endTime: slot.endTime, available };
}
