import type { ReservationActor } from '../domain/entities/reservation.entity.js';
import { ReservationNotFoundException } from '../domain/exceptions/reservation-domain.exception.js';
import type {
  BookableRoom,
  RoomBookingPort,
} from './ports/room-booking.port.js';

// Gestionnaire propriétaire de la salle ou administrateur
export const managesRoom = (room: BookableRoom, actor: ReservationActor) =>
  actor.isAdmin || room.ownerId === actor.id;

export async function findRoomOrFail(
  rooms: RoomBookingPort,
  roomId: string,
): Promise<BookableRoom> {
  const room = await rooms.findRoom(roomId);
  if (!room) throw new ReservationNotFoundException('Salle introuvable');
  return room;
}
