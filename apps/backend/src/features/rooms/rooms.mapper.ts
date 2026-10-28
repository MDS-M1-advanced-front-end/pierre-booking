import type { Availability } from '../../models/availabilities.model.js';
import type { AvailabilitySlotDTO } from '../../modules/rooms/infrastructure/dtos/rooms.dto.js';

export function toAvailabilitySlotDTO(
  slot: Availability,
  available = slot.isAvailable,
): AvailabilitySlotDTO {
  return { startTime: slot.startTime, endTime: slot.endTime, available };
}
