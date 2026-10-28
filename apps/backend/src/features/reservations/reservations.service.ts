import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsWhere } from 'typeorm';
import { toSkipTake } from '../../common/pagination.dto.js';
import { addDays, fromParis } from '../../common/paris-time.js';
import { Reservation } from '../../models/reservations.model.js';
import type { TypeOrmRoomEntity as Room } from '../../modules/rooms/infrastructure/persistence/typeorm-room.entity.js';
import type { AdminReservationsQueryDTO } from '../admin/admin.dto.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { AvailabilityService } from '../rooms/availability.service.js';
import { canManageRoom } from '../rooms/rooms.access.js';
import { RoomStatus } from '../../modules/rooms/domain/entities/room.entity.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { UserRole } from '../users/users.dto.js';
import { ACTIVE_RESERVATION_STATUSES } from './reservations.constants.js';
import {
  ReservationStatus,
  type CreateReservationDTO,
  type PaginatedReservationsDTO,
  type RejectReservationDTO,
  type ReservationDTO,
  type ReservationsQueryDTO,
  type UpdateReservationDTO,
} from './reservations.dto.js';
import { toReservationDTO } from './reservations.mapper.js';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
    private readonly roomsService: RoomsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * GET /reservations : celles de l'utilisateur connecté, ou, pour un gestionnaire,
   * celles de ses salles (écran « Demandes » du front, anomalie 4 de docs/cadrage.md).
   */
  async findMine(
    query: ReservationsQueryDTO,
    user: AuthUser,
  ): Promise<PaginatedReservationsDTO> {
    const qb = this.reservations.createQueryBuilder('reservation');
    if (user.role === UserRole.GESTIONNAIRE) {
      qb.innerJoin('reservation.room', 'room').where(
        'room.owner_id = :userId',
        { userId: user.id },
      );
    } else {
      qb.where('reservation.user_id = :userId', { userId: user.id });
    }
    if (query.status) {
      qb.andWhere('reservation.status = :status', { status: query.status });
    }
    // Dates de Paris, bornes incluses
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
    const { skip, take, page, pageSize } = toSkipTake(query);
    const [reservations, total] = await qb
      .orderBy('reservation.start_at', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return { items: reservations.map(toReservationDTO), page, pageSize, total };
  }

  // GET /admin/reservations
  async findAll(
    query: AdminReservationsQueryDTO,
  ): Promise<PaginatedReservationsDTO> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    // TypeORM refuse les valeurs undefined dans un where
    const where: FindOptionsWhere<Reservation> = {};
    if (query.status) where.status = query.status;
    if (query.roomId) where.roomId = query.roomId;
    if (query.userId) where.userId = query.userId;
    const [reservations, total] = await this.reservations.findAndCount({
      where,
      order: { startAt: 'DESC' },
      skip,
      take,
    });
    return { items: reservations.map(toReservationDTO), page, pageSize, total };
  }

  async findOne(
    reservationId: string,
    user: AuthUser,
  ): Promise<ReservationDTO> {
    const reservation = await this.getOrFail(reservationId);
    if (
      reservation.userId !== user.id &&
      !canManageRoom(reservation.room, user)
    ) {
      throw new ForbiddenException();
    }
    return toReservationDTO(reservation);
  }

  async create(
    body: CreateReservationDTO,
    user: AuthUser,
  ): Promise<ReservationDTO> {
    const room = await this.roomsService.getOrFail(body.roomId);
    if (room.status !== RoomStatus.ACTIVE) {
      throw new ConflictException("La salle n'est pas réservable");
    }
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    this.assertValidSlot(startAt, endAt);
    this.assertCapacity(room, body.numberOfParticipants);
    await this.availabilityService.assertBookable(room, startAt, endAt);

    const reservation = await this.reservations.save(
      this.reservations.create({
        roomId: room.id,
        userId: user.id,
        startAt,
        endAt,
        numberOfParticipants: body.numberOfParticipants ?? null,
        comment: body.comment ?? null,
        totalAmount: this.computeAmount(room, startAt, endAt),
        status: ReservationStatus.PENDING,
      }),
    );
    return toReservationDTO(reservation);
  }

  async update(
    reservationId: string,
    body: UpdateReservationDTO,
    user: AuthUser,
  ): Promise<ReservationDTO> {
    const reservation = await this.getOrFail(reservationId);
    this.assertAuthorOrAdmin(reservation, user);
    this.assertActive(reservation, 'modifiée');
    const { room } = reservation;

    const startAt = body.startAt ? new Date(body.startAt) : reservation.startAt;
    const endAt = body.endAt ? new Date(body.endAt) : reservation.endAt;
    const slotChanged =
      startAt.getTime() !== reservation.startAt.getTime() ||
      endAt.getTime() !== reservation.endAt.getTime();

    if (slotChanged) {
      this.assertValidSlot(startAt, endAt);
      await this.availabilityService.assertBookable(
        room,
        startAt,
        endAt,
        reservation.id,
      );
      reservation.startAt = startAt;
      reservation.endAt = endAt;
      reservation.totalAmount = this.computeAmount(room, startAt, endAt);
      // Un nouveau créneau doit être revalidé par le gestionnaire
      reservation.status = ReservationStatus.PENDING;
    }
    if (body.numberOfParticipants !== undefined) {
      this.assertCapacity(room, body.numberOfParticipants);
      reservation.numberOfParticipants = body.numberOfParticipants;
    }
    if (body.comment !== undefined) reservation.comment = body.comment;

    return toReservationDTO(await this.reservations.save(reservation));
  }

  // Annulation logique : la réservation reste consultable
  async cancel(reservationId: string, user: AuthUser): Promise<void> {
    const reservation = await this.getOrFail(reservationId);
    this.assertAuthorOrAdmin(reservation, user);
    this.assertActive(reservation, 'annulée');
    reservation.status = ReservationStatus.CANCELLED;
    await this.reservations.save(reservation);
  }

  confirm(reservationId: string, user: AuthUser): Promise<ReservationDTO> {
    return this.decide(reservationId, user, ReservationStatus.CONFIRMED);
  }

  reject(
    reservationId: string,
    body: RejectReservationDTO,
    user: AuthUser,
  ): Promise<ReservationDTO> {
    return this.decide(
      reservationId,
      user,
      ReservationStatus.REJECTED,
      body.reason,
    );
  }

  // Charge aussi la salle, utilisée pour les droits et les règles métier
  async getOrFail(reservationId: string): Promise<Reservation> {
    const reservation = await this.reservations.findOne({
      where: { id: reservationId },
      relations: { room: true },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    return reservation;
  }

  // Confirmation ou refus par le gestionnaire de la salle ou un administrateur
  private async decide(
    reservationId: string,
    user: AuthUser,
    status: ReservationStatus.CONFIRMED | ReservationStatus.REJECTED,
    reason?: string,
  ): Promise<ReservationDTO> {
    const reservation = await this.getOrFail(reservationId);
    if (!canManageRoom(reservation.room, user)) throw new ForbiddenException();
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new ConflictException(
        `Réservation au statut ${reservation.status} : seule une réservation PENDING peut être traitée`,
      );
    }
    reservation.status = status;
    if (reason !== undefined) reservation.rejectionReason = reason;
    // Envoi de la notification au client : service externe, non branché
    return toReservationDTO(await this.reservations.save(reservation));
  }

  private assertAuthorOrAdmin(reservation: Reservation, user: AuthUser): void {
    if (
      reservation.userId !== user.id &&
      user.role !== UserRole.ADMINISTRATEUR
    ) {
      throw new ForbiddenException();
    }
  }

  private assertActive(reservation: Reservation, action: string): void {
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      throw new ConflictException(
        `Réservation au statut ${reservation.status} : elle ne peut pas être ${action}`,
      );
    }
  }

  private assertValidSlot(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new BadRequestException('startAt doit précéder endAt');
    }
    if (startAt <= new Date()) {
      throw new BadRequestException('Le créneau doit être dans le futur');
    }
  }

  private assertCapacity(room: Room, numberOfParticipants?: number): void {
    if (
      numberOfParticipants !== undefined &&
      numberOfParticipants > room.capacity
    ) {
      throw new BadRequestException(
        `La salle accueille au plus ${room.capacity} personnes`,
      );
    }
  }

  private computeAmount(room: Room, startAt: Date, endAt: Date): number {
    const hours = (endAt.getTime() - startAt.getTime()) / HOUR_MS;
    return Math.round(hours * room.pricePerHour * 100) / 100;
  }
}
