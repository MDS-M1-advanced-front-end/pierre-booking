import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Availability } from '../../models/availabilities.model.js';
import { Reservation } from '../../models/reservations.model.js';
import { Room } from '../../models/rooms.model.js';
import { AvailabilityService } from './availability.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Availability, Reservation])],
  controllers: [RoomsController],
  providers: [RoomsService, AvailabilityService],
  exports: [RoomsService, AvailabilityService],
})
export class RoomsModule {}
