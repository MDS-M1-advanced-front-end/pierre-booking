// Disponibilités des salles : implémenté par AvailabilityService (features/rooms) en attendant
// sa migration dans ce module
export interface RoomAvailabilityPort {
  findFreeRoomIds(
    date: string,
    startTime?: string,
    endTime?: string,
  ): Promise<string[]>;
}

export const ROOM_AVAILABILITY = 'RoomAvailabilityPort';
