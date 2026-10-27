import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays, fromParis } from '../../common/paris-time.js';
import { Reservation } from '../../models/reservations.model.js';
import { Room } from '../../models/rooms.model.js';
import { User } from '../../models/users.model.js';
import { ReservationStatus } from '../reservations/reservations.dto.js';
import type { StatisticsDTO, StatisticsQueryDTO } from './admin.dto.js';

// Une réservation COMPLETED a été confirmée : elle compte comme confirmée et dans le chiffre d'affaires
const CONFIRMED_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.COMPLETED,
];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
  ) {}

  // from / to : dates de Paris, incluses, appliquées à la date de début des réservations
  async getStatistics(query: StatisticsQueryDTO): Promise<StatisticsDTO> {
    const qb = this.reservations
      .createQueryBuilder('reservation')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE reservation.status IN (:...confirmed))',
        'confirmed',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE reservation.status = :cancelled)',
        'cancelled',
      )
      .addSelect(
        'COALESCE(SUM(reservation.total_amount) FILTER (WHERE reservation.status IN (:...confirmed)), 0)',
        'revenue',
      )
      .setParameters({
        confirmed: CONFIRMED_STATUSES,
        cancelled: ReservationStatus.CANCELLED,
      });
    if (query.from) {
      qb.andWhere('reservation.start_at >= :from', {
        from: fromParis(query.from),
      });
    }
    if (query.to) {
      qb.andWhere('reservation.start_at < :to', {
        to: fromParis(addDays(query.to, 1)),
      });
    }

    const [totalUsers, totalRooms, stats] = await Promise.all([
      this.users.count(),
      this.rooms.count(),
      qb.getRawOne<{
        total: string;
        confirmed: string;
        cancelled: string;
        revenue: string;
      }>(),
    ]);
    return {
      totalUsers,
      totalRooms,
      totalReservations: Number(stats?.total ?? 0),
      confirmedReservations: Number(stats?.confirmed ?? 0),
      cancelledReservations: Number(stats?.cancelled ?? 0),
      totalRevenue: Number(stats?.revenue ?? 0),
    };
  }
}
