import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../../models/reservations.model.js';
import { Room } from '../../models/rooms.model.js';
import { User } from '../../models/users.model.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Room, Reservation]),
    ReservationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
