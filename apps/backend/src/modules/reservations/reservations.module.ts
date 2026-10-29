import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomBookingService } from '../rooms/application/services/room-booking.service';
import { TypeOrmRoomEntity } from '../rooms/infrastructure/persistence/typeorm-room.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { TypeOrmUserEntity } from '../users/infrastructure/persistence/typeorm-user.entity';
import { PAYMENT_GATEWAY } from './application/ports/payment-gateway.port';
import { ROOM_BOOKING } from './application/ports/room-booking.port';
import { STATISTICS } from './application/ports/statistics.port';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case';
import { GetPaymentUseCase } from './application/use-cases/get-payment.use-case';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case';
import { GetStatisticsUseCase } from './application/use-cases/get-statistics.use-case';
import { ListAllReservationsUseCase } from './application/use-cases/list-all-reservations.use-case';
import { ListReservationsUseCase } from './application/use-cases/list-reservations.use-case';
import { RejectReservationUseCase } from './application/use-cases/reject-reservation.use-case';
import { UpdateReservationUseCase } from './application/use-cases/update-reservation.use-case';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository.interface';
import { RESERVATION_REPOSITORY } from './domain/repositories/reservation.repository.interface';
import { AdminController } from './infrastructure/controllers/admin.controller';
import { PaymentsController } from './infrastructure/controllers/payments.controller';
import { ReservationsController } from './infrastructure/controllers/reservations.controller';
import { MockPaymentGateway } from './infrastructure/payment/mock-payment.gateway';
import { TypeOrmPaymentEntity } from './infrastructure/persistence/typeorm-payment.entity';
import { TypeormPaymentRepository } from './infrastructure/persistence/typeorm-payment.repository';
import { TypeOrmReservationEntity } from './infrastructure/persistence/typeorm-reservation.entity';
import { TypeormReservationRepository } from './infrastructure/persistence/typeorm-reservation.repository';
import { TypeormStatisticsQuery } from './infrastructure/persistence/typeorm-statistics.query';

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
