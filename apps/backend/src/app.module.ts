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
import { dataSourceOptions } from './database/data-source.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
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
