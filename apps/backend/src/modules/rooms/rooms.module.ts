import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmReservationEntity } from '../reservations/infrastructure/persistence/typeorm-reservation.entity';
import { ROOM_OCCUPANCY } from './application/ports/room-occupancy.port';
import { RoomAvailabilityService } from './application/services/room-availability.service';
import { RoomBookingService } from './application/services/room-booking.service';
import { CreateRoomUseCase } from './application/use-cases/create-room.use-case';
import { DeleteRoomUseCase } from './application/use-cases/delete-room.use-case';
import { GetRoomAvailabilityUseCase } from './application/use-cases/get-room-availability.use-case';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case';
import { GetRoomsUseCase } from './application/use-cases/get-rooms.use-case';
import { SetRoomAvailabilityUseCase } from './application/use-cases/set-room-availability.use-case';
import { UpdateRoomUseCase } from './application/use-cases/update-room.use-case';
import { AVAILABILITY_REPOSITORY } from './domain/repositories/availability.repository.interface';
import { ROOM_REPOSITORY } from './domain/repositories/room.repository.interface';
import { RoomsController } from './infrastructure/controllers/rooms.controller';
import { TypeOrmAvailabilityEntity } from './infrastructure/persistence/typeorm-availability.entity';
import { TypeormAvailabilityRepository } from './infrastructure/persistence/typeorm-availability.repository';
import { TypeormRoomOccupancyAdapter } from './infrastructure/persistence/typeorm-room-occupancy.adapter';
import { TypeOrmRoomEntity } from './infrastructure/persistence/typeorm-room.entity';
import { TypeormRoomRepository } from './infrastructure/persistence/typeorm-room.repository';

/**
 * Salles et leurs disponibilités. Exporte RoomBookingService pour le module reservations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TypeOrmRoomEntity,
      TypeOrmAvailabilityEntity,
      // Lecture seule, pour l'occupation des créneaux
      TypeOrmReservationEntity,
    ]),
  ],
  controllers: [RoomsController],
  providers: [
    CreateRoomUseCase,
    GetRoomsUseCase,
    GetRoomUseCase,
    UpdateRoomUseCase,
    DeleteRoomUseCase,
    GetRoomAvailabilityUseCase,
    SetRoomAvailabilityUseCase,
    RoomAvailabilityService,
    RoomBookingService,
    { provide: ROOM_REPOSITORY, useClass: TypeormRoomRepository },
    {
      provide: AVAILABILITY_REPOSITORY,
      useClass: TypeormAvailabilityRepository,
    },
    { provide: ROOM_OCCUPANCY, useClass: TypeormRoomOccupancyAdapter },
  ],
  exports: [RoomBookingService],
})
export class RoomsModule {}
