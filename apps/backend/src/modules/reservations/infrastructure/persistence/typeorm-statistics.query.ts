import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmRoomEntity } from '../../../rooms/infrastructure/persistence/typeorm-room.entity.js';
import { TypeOrmUserEntity } from '../../../users/infrastructure/persistence/typeorm-user.entity.js';
import type {
  Statistics,
  StatisticsPort,
} from '../../application/ports/statistics.port.js';
import { ReservationStatus } from '../../domain/entities/reservation.entity.js';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity.js';

// Une réservation COMPLETED a été confirmée : elle compte comme confirmée et dans le chiffre d'affaires
const CONFIRMED_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.COMPLETED,
];

// Requête de lecture sur les trois tables : un cas où passer par les repositories du domaine
// (un aller-retour par compteur) n'apporterait rien
@Injectable()
export class TypeormStatisticsQuery implements StatisticsPort {
  constructor(
    @InjectRepository(TypeOrmUserEntity)
    private readonly users: Repository<TypeOrmUserEntity>,
    @InjectRepository(TypeOrmRoomEntity)
    private readonly rooms: Repository<TypeOrmRoomEntity>,
    @InjectRepository(TypeOrmReservationEntity)
    private readonly reservations: Repository<TypeOrmReservationEntity>,
  ) {}

  async compute(period: { from?: Date; before?: Date }): Promise<Statistics> {
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
    if (period.from) {
      qb.andWhere('reservation.start_at >= :from', { from: period.from });
    }
    if (period.before) {
      qb.andWhere('reservation.start_at < :before', { before: period.before });
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
