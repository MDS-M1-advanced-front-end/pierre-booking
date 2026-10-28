import { Inject, Injectable } from '@nestjs/common';
import type {
  Reservation,
  ReservationStatus,
} from '../../domain/entities/reservation.entity.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface.js';

// GET /admin/reservations (administrateurs)
@Injectable()
export class ListAllReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
  ) {}

  execute(filters: {
    status?: ReservationStatus;
    roomId?: string;
    userId?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: Reservation[]; total: number }> {
    return this.reservationRepository.findPage(filters);
  }
}
