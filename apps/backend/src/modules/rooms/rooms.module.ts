import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmReservationEntity } from '../reservations/infrastructure/persistence/typeorm-reservation.entity.js';
import { ROOM_OCCUPANCY } from './application/ports/room-occupancy.port.js';
import { RoomAvailabilityService } from './application/services/room-availability.service.js';
import { RoomBookingService } from './application/services/room-booking.service.js';
import { CreateRoomUseCase } from './application/use-cases/create-room.use-case.js';
import { DeleteRoomUseCase } from './application/use-cases/delete-room.use-case.js';
import { GetRoomAvailabilityUseCase } from './application/use-cases/get-room-availability.use-case.js';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case.js';
import { GetRoomsUseCase } from './application/use-cases/get-rooms.use-case.js';
import { SetRoomAvailabilityUseCase } from './application/use-cases/set-room-availability.use-case.js';
import { UpdateRoomUseCase } from './application/use-cases/update-room.use-case.js';
import { AVAILABILITY_REPOSITORY } from './domain/repositories/availability.repository.interface.js';
import { ROOM_REPOSITORY } from './domain/repositories/room.repository.interface.js';
import { RoomsController } from './infrastructure/controllers/rooms.controller.js';
import { TypeOrmAvailabilityEntity } from './infrastructure/persistence/typeorm-availability.entity.js';
import { TypeormAvailabilityRepository } from './infrastructure/persistence/typeorm-availability.repository.js';
import { TypeormRoomOccupancyAdapter } from './infrastructure/persistence/typeorm-room-occupancy.adapter.js';
import { TypeOrmRoomEntity } from './infrastructure/persistence/typeorm-room.entity.js';
import { TypeormRoomRepository } from './infrastructure/persistence/typeorm-room.repository.js';

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
