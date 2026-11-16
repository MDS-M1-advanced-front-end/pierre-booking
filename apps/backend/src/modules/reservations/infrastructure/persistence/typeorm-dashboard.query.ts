import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  type ObjectLiteral,
  type SelectQueryBuilder,
} from 'typeorm';
import { TypeOrmRoomEntity } from '../../../rooms/infrastructure/persistence/typeorm-room.entity';
import { TypeOrmUserEntity } from '../../../users/infrastructure/persistence/typeorm-user.entity';
import type { Period } from '../../application/period';
import type {
  ClientPerformance,
  DashboardPort,
  Granularity,
  RoomPerformance,
  RoomSort,
  SortDirection,
  StatusBreakdown,
  TimelinePoint,
} from '../../application/ports/dashboard.port';
import { ReservationStatus } from '../../domain/entities/reservation.entity';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity';

/** Une réservation COMPLETED a été confirmée : elle compte comme confirmée et dans le chiffre d'affaires. */
const CONFIRMED_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.COMPLETED,
];
const CONFIRMED = 'reservation.status IN (:...confirmed)';

/** Unité de date_trunc ; la semaine de PostgreSQL commence le lundi. */
const TRUNC_UNITS: Record<Granularity, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

/** Colonne de tri de chaque critère (alias du SELECT de rankRooms). */
const ROOM_SORT_COLUMNS: Record<RoomSort, string> = {
  REVENUE: 'revenue',
  RESERVATIONS: 'reservations',
  BOOKED_HOURS: 'booked_hours',
};

/** Compteurs communs aux salles et aux clients : réservations, confirmées, chiffre d'affaires. */
function selectCounters<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  return qb
    .addSelect('COUNT(reservation.id)', 'reservations')
    .addSelect(`COUNT(reservation.id) FILTER (WHERE ${CONFIRMED})`, 'confirmed')
    .addSelect(
      `COALESCE(SUM(reservation.total_amount) FILTER (WHERE ${CONFIRMED}), 0)`,
      'revenue',
    )
    .setParameter('confirmed', CONFIRMED_STATUSES);
}

/**
 * Condition SQL de la période, sur l'alias `reservation`. Pour une jointure externe, elle va dans
 * la condition de jointure (ON) : dans le WHERE, elle retirerait les lignes sans réservation.
 */
function periodCondition(period: Period): [string, ObjectLiteral] {
  const conditions = ['TRUE'];
  if (period.from) conditions.push('reservation.start_at >= :from');
  if (period.before) conditions.push('reservation.start_at < :before');
  return [
    conditions.join(' AND '),
    { from: period.from, before: period.before },
  ];
}

/**
 * Implémentation TypeORM de `DashboardPort` : agrégats SQL, une requête par champ du tableau de
 * bord. Comme `TypeormStatisticsQuery`, une requête de lecture qui ne passe pas par les
 * repositories du domaine.
 */
@Injectable()
export class TypeormDashboardQuery implements DashboardPort {
  constructor(
    @InjectRepository(TypeOrmUserEntity)
    private readonly users: Repository<TypeOrmUserEntity>,
    @InjectRepository(TypeOrmRoomEntity)
    private readonly rooms: Repository<TypeOrmRoomEntity>,
    @InjectRepository(TypeOrmReservationEntity)
    private readonly reservations: Repository<TypeOrmReservationEntity>,
  ) {}

  /** @inheritdoc */
  async countByStatus(period: Period): Promise<StatusBreakdown[]> {
    const rows = await this.reservations
      .createQueryBuilder('reservation')
      .select('reservation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(reservation.total_amount), 0)', 'amount')
      .where(...periodCondition(period))
      .groupBy('reservation.status')
      .getRawMany<{
        status: ReservationStatus;
        count: string;
        amount: string;
      }>();
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      amount: Number(row.amount),
    }));
  }

  /** @inheritdoc */
  async timeline(
    period: Period,
    granularity: Granularity,
  ): Promise<TimelinePoint[]> {
    const rows = await this.reservations
      .createQueryBuilder('reservation')
      .select(
        "TO_CHAR(DATE_TRUNC(:unit, reservation.start_at AT TIME ZONE 'Europe/Paris'), 'YYYY-MM-DD')",
        'bucket',
      )
      .addSelect('COUNT(*)', 'reservations')
      .addSelect(`COUNT(*) FILTER (WHERE ${CONFIRMED})`, 'confirmed')
      .addSelect(
        `COALESCE(SUM(reservation.total_amount) FILTER (WHERE ${CONFIRMED}), 0)`,
        'revenue',
      )
      .setParameters({
        unit: TRUNC_UNITS[granularity],
        confirmed: CONFIRMED_STATUSES,
      })
      .where(...periodCondition(period))
      // Alias du SELECT : TO_CHAR(…) garde l'ordre chronologique (YYYY-MM-DD)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{
        bucket: string;
        reservations: string;
        confirmed: string;
        revenue: string;
      }>();
    return rows.map((row) => ({
      date: row.bucket,
      reservations: Number(row.reservations),
      confirmedReservations: Number(row.confirmed),
      revenue: Number(row.revenue),
    }));
  }

  /** @inheritdoc */
  async rankRooms(
    period: Period,
    ranking: { sort: RoomSort; direction: SortDirection; limit: number },
  ): Promise<RoomPerformance[]> {
    const qb = this.rooms
      .createQueryBuilder('room')
      .select('room.id', 'id')
      .addSelect('room.name', 'name')
      .addSelect('room.location', 'location')
      .addSelect('room.capacity', 'capacity')
      .addSelect('room.price_per_hour', 'price_per_hour')
      .addSelect('room.status', 'status')
      .leftJoin('room.reservations', 'reservation', ...periodCondition(period));
    const rows = await selectCounters(qb)
      .addSelect(
        `COALESCE(SUM(EXTRACT(EPOCH FROM reservation.end_at - reservation.start_at)) FILTER (WHERE ${CONFIRMED}), 0) / 3600`,
        'booked_hours',
      )
      // Les autres colonnes de room dépendent de sa clé primaire : PostgreSQL les accepte
      .groupBy('room.id')
      .orderBy(ROOM_SORT_COLUMNS[ranking.sort], ranking.direction)
      .addOrderBy('room.name', 'ASC')
      // limit et non take : take ajoute une sous-requête DISTINCT, inutile ici (une ligne par salle)
      .limit(ranking.limit)
      .getRawMany<{
        id: string;
        name: string;
        location: string;
        capacity: number;
        price_per_hour: string;
        status: RoomPerformance['room']['status'];
        reservations: string;
        confirmed: string;
        revenue: string;
        booked_hours: string;
      }>();
    return rows.map((row) => ({
      room: {
        id: row.id,
        name: row.name,
        location: row.location,
        capacity: row.capacity,
        pricePerHour: Number(row.price_per_hour),
        status: row.status,
      },
      reservations: Number(row.reservations),
      confirmedReservations: Number(row.confirmed),
      revenue: Number(row.revenue),
      bookedHours: Number(row.booked_hours),
    }));
  }

  /** @inheritdoc */
  async topClients(
    period: Period,
    limit: number,
  ): Promise<ClientPerformance[]> {
    // Alias client : user est un mot réservé de PostgreSQL
    const qb = this.users
      .createQueryBuilder('client')
      .select('client.id', 'id')
      .addSelect('client.first_name', 'first_name')
      .addSelect('client.last_name', 'last_name')
      .addSelect('client.email', 'email')
      .innerJoin(
        'client.reservations',
        'reservation',
        ...periodCondition(period),
      );
    const rows = await selectCounters(qb)
      .groupBy('client.id')
      .orderBy('revenue', 'DESC')
      .addOrderBy('reservations', 'DESC')
      .addOrderBy('client.last_name', 'ASC')
      .limit(limit)
      .getRawMany<{
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        reservations: string;
        confirmed: string;
        revenue: string;
      }>();
    return rows.map((row) => ({
      user: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      },
      reservations: Number(row.reservations),
      confirmedReservations: Number(row.confirmed),
      revenue: Number(row.revenue),
    }));
  }
}
