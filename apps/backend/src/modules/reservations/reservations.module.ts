import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomBookingService } from '../rooms/application/services/room-booking.service.js';
import { TypeOrmRoomEntity } from '../rooms/infrastructure/persistence/typeorm-room.entity.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { TypeOrmUserEntity } from '../users/infrastructure/persistence/typeorm-user.entity.js';
import { PAYMENT_GATEWAY } from './application/ports/payment-gateway.port.js';
import { ROOM_BOOKING } from './application/ports/room-booking.port.js';
import { STATISTICS } from './application/ports/statistics.port.js';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case.js';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case.js';
import { GetPaymentUseCase } from './application/use-cases/get-payment.use-case.js';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case.js';
import { GetStatisticsUseCase } from './application/use-cases/get-statistics.use-case.js';
import { ListAllReservationsUseCase } from './application/use-cases/list-all-reservations.use-case.js';
import { ListReservationsUseCase } from './application/use-cases/list-reservations.use-case.js';
import { RejectReservationUseCase } from './application/use-cases/reject-reservation.use-case.js';
import { UpdateReservationUseCase } from './application/use-cases/update-reservation.use-case.js';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository.interface.js';
import { RESERVATION_REPOSITORY } from './domain/repositories/reservation.repository.interface.js';
import { AdminController } from './infrastructure/controllers/admin.controller.js';
import { PaymentsController } from './infrastructure/controllers/payments.controller.js';
import { ReservationsController } from './infrastructure/controllers/reservations.controller.js';
import { MockPaymentGateway } from './infrastructure/payment/mock-payment.gateway.js';
import { TypeOrmPaymentEntity } from './infrastructure/persistence/typeorm-payment.entity.js';
import { TypeormPaymentRepository } from './infrastructure/persistence/typeorm-payment.repository.js';
import { TypeOrmReservationEntity } from './infrastructure/persistence/typeorm-reservation.entity.js';
import { TypeormReservationRepository } from './infrastructure/persistence/typeorm-reservation.repository.js';
import { TypeormStatisticsQuery } from './infrastructure/persistence/typeorm-statistics.query.js';

/**
 * Réservations, paiements et administration (liste de toutes les réservations, statistiques).
 * Lit les salles à travers le port ROOM_BOOKING, branché sur RoomBookingService (module rooms).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TypeOrmReservationEntity,
      TypeOrmPaymentEntity,
      // Lecture seule, pour les statistiques
      TypeOrmUserEntity,
      TypeOrmRoomEntity,
    ]),
    // Lecture des salles et de leurs disponibilités (port ROOM_BOOKING)
    RoomsModule,
  ],
  controllers: [ReservationsController, PaymentsController, AdminController],
  providers: [
    ListReservationsUseCase,
    ListAllReservationsUseCase,
    GetReservationUseCase,
    CreateReservationUseCase,
    UpdateReservationUseCase,
    CancelReservationUseCase,
    ConfirmReservationUseCase,
    RejectReservationUseCase,
    CreatePaymentUseCase,
    GetPaymentUseCase,
    GetStatisticsUseCase,
    { provide: RESERVATION_REPOSITORY, useClass: TypeormReservationRepository },
    { provide: PAYMENT_REPOSITORY, useClass: TypeormPaymentRepository },
    { provide: ROOM_BOOKING, useExisting: RoomBookingService },
    { provide: PAYMENT_GATEWAY, useClass: MockPaymentGateway },
    { provide: STATISTICS, useClass: TypeormStatisticsQuery },
  ],
})
export class ReservationsModule {}
