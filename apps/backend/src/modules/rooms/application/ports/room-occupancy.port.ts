// Périodes occupées par les réservations actives (PENDING ou CONFIRMED) des salles
export interface Occupancy {
  roomId: string;
  startAt: Date;
  endAt: Date;
}

export interface RoomOccupancyPort {
  findOccupied(
    roomIds: string[],
    from: Date,
    to: Date,
    excludedReservationId?: string,
  ): Promise<Occupancy[]>;
}

export const ROOM_OCCUPANCY = 'RoomOccupancyPort';
