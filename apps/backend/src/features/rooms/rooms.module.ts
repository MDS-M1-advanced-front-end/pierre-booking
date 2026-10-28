import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Availability } from '../../models/availabilities.model.js';
import { Reservation } from '../../models/reservations.model.js';
import { TypeOrmRoomEntity as Room } from '../../modules/rooms/infrastructure/persistence/typeorm-room.entity.js';
import { AvailabilityService } from './availability.service.js';
import { RoomsService } from './rooms.service.js';

// Reste de l'ancien module des salles, en attendant la migration vers modules/rooms :
// disponibilités, et lecture d'une salle pour les réservations
@Module({
  imports: [TypeOrmModule.forFeature([Room, Availability, Reservation])],
  providers: [RoomsService, AvailabilityService],
  exports: [RoomsService, AvailabilityService],
})
export class RoomAvailabilityModule {}
