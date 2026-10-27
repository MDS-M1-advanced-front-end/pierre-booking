import type { Availability } from '../../models/availabilities.model.js';
import type { Room } from '../../models/rooms.model.js';
import type { AvailabilitySlotDTO, RoomDTO } from './rooms.dto.js';

export function toRoomDTO(room: Room): RoomDTO {
  return {
    id: room.id,
    name: room.name,
    description: room.description ?? undefined,
    capacity: room.capacity,
    location: room.location,
    equipment: room.equipment,
    pricePerHour: room.pricePerHour,
    status: room.status,
    ownerId: room.ownerId,
    imageUrl: room.imageUrl ?? undefined,
    createdAt: room.createdAt.toISOString(),
  };
}

export function toAvailabilitySlotDTO(
  slot: Availability,
  available = slot.isAvailable,
): AvailabilitySlotDTO {
  return { startTime: slot.startTime, endTime: slot.endTime, available };
}
