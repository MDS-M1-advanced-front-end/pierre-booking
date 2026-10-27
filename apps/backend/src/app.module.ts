import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminController } from './features/admin/admin.controller.js';
import { AuthController } from './features/auth/auth.controller.js';
import { PaymentsController } from './features/payments/payments.controller.js';
import { ReservationsController } from './features/reservations/reservations.controller.js';
import { RoomsController } from './features/rooms/rooms.controller.js';
import { UsersController } from './features/users/users.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './models/users.model.js';
import { Room } from './models/rooms.model.js';
import { Reservation } from './models/reservations.model.js';
import { Payment } from './models/payments.model.js';
import { Availability } from './models/availabilities.model.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'resa_user',
      password: process.env.DB_PASSWORD || 'resa_password',
      database: process.env.DB_NAME || 'resa_db',
      autoLoadEntities: true,
      synchronize: false, // OBLIGATOIRE : Utilisation stricte des migrations en production/M
      entities: [User, Room, Reservation, Availability, Payment],
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    UsersController,
    RoomsController,
    ReservationsController,
    PaymentsController,
    AdminController,
  ],
  providers: [AppService],
})
export class AppModule {}
