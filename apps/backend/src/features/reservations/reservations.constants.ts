import { ReservationStatus } from './reservations.dto.js';

// Statuts qui occupent le créneau de la salle
export const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
];
