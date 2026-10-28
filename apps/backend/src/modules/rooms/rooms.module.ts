import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomAvailabilityModule } from '../../features/rooms/rooms.module.js';
import { AvailabilityService } from '../../features/rooms/availability.service.js';
import { ROOM_AVAILABILITY } from './application/ports/room-availability.port.js';
import { CreateRoomUseCase } from './application/use-cases/create-room.use-case.js';
import { DeleteRoomUseCase } from './application/use-cases/delete-room.use-case.js';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case.js';
import { GetRoomsUseCase } from './application/use-cases/get-rooms.use-case.js';
import { UpdateRoomUseCase } from './application/use-cases/update-room.use-case.js';
import { ROOM_REPOSITORY } from './domain/repositories/room.repository.interface.js';
import { RoomsController } from './infrastructure/controllers/rooms.controller.js';
import { TypeOrmRoomEntity } from './infrastructure/persistence/typeorm-room.entity.js';
import { TypeormRoomRepository } from './infrastructure/persistence/typeorm-room.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TypeOrmRoomEntity]),
    // Disponibilités (encore dans features/rooms) : routes /rooms/{id}/availability et filtre date
    RoomAvailabilityModule,
  ],
  controllers: [RoomsController],
  providers: [
    CreateRoomUseCase,
    GetRoomsUseCase,
    GetRoomUseCase,
    UpdateRoomUseCase,
    DeleteRoomUseCase,
    {
      provide: ROOM_REPOSITORY,
      useClass: TypeormRoomRepository,
    },
    {
      provide: ROOM_AVAILABILITY,
      useExisting: AvailabilityService,
    },
  ],
})
export class RoomsModule {}
