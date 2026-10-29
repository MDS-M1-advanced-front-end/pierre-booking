import type { RoomStatus } from '../../../rooms/domain/entities/room.entity';
import type { ReservationStatus } from '../../domain/entities/reservation.entity';
import type { Period } from '../period';

/** Pas de temps d'une série chronologique (la semaine commence le lundi). */
export const GRANULARITIES = ['DAY', 'WEEK', 'MONTH'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

/** Critère de classement des salles. */
export const ROOM_SORTS = ['REVENUE', 'RESERVATIONS', 'BOOKED_HOURS'] as const;
export type RoomSort = (typeof ROOM_SORTS)[number];

export const SORT_DIRECTIONS = ['ASC', 'DESC'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Nombre de réservations et montant cumulé d'un statut. */
export interface StatusBreakdown {
  status: ReservationStatus;
  count: number;
  amount: number;
}

/** Un intervalle d'une série chronologique. */
export interface TimelinePoint {
  /** Premier jour de l'intervalle, date de Paris (YYYY-MM-DD). */
  date: string;
  reservations: number;
  confirmedReservations: number;
  revenue: number;
}

export interface RoomPerformance {
  room: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    pricePerHour: number;
    status: RoomStatus;
  };
  reservations: number;
  confirmedReservations: number;
  revenue: number;
  /** Heures des réservations confirmées. */
  bookedHours: number;
}

export interface ClientPerformance {
  user: { id: string; firstName: string; lastName: string; email: string };
  reservations: number;
  confirmedReservations: number;
  revenue: number;
}

/**
 * Requêtes de lecture du tableau de bord d'administration (agrégats sur plusieurs tables).
 * Confirmée : CONFIRMED ou COMPLETED ; seules les réservations confirmées comptent dans le
 * chiffre d'affaires et les heures réservées.
 */
export interface DashboardPort {
  /**
   * @param period - Bornes sur la date de début des réservations.
   * @returns Une ligne par statut présent sur la période (les statuts absents sont omis).
   */
  countByStatus(period: Period): Promise<StatusBreakdown[]>;

  /**
   * @param period - Bornes sur la date de début des réservations.
   * @param granularity - Pas de temps, en heure de Paris.
   * @returns Les intervalles qui ont au moins une réservation, du plus ancien au plus récent.
   */
  timeline(period: Period, granularity: Granularity): Promise<TimelinePoint[]>;

  /**
   * @param period - Bornes sur la date de début des réservations.
   * @param ranking - Critère, sens et nombre de salles ; à égalité, ordre alphabétique.
   * @returns Les salles classées, y compris celles sans réservation.
   */
  rankRooms(
    period: Period,
    ranking: { sort: RoomSort; direction: SortDirection; limit: number },
  ): Promise<RoomPerformance[]>;

  /**
   * @param period - Bornes sur la date de début des réservations.
   * @param limit - Nombre de clients.
   * @returns Les clients qui ont réservé sur la période, par chiffre d'affaires décroissant.
   */
  topClients(period: Period, limit: number): Promise<ClientPerformance[]>;
}

/** Jeton d'injection de `DashboardPort`. */
export const DASHBOARD = 'DashboardPort';
