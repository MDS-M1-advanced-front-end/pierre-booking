import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminModule } from './features/admin/admin.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { PaymentsModule } from './features/payments/payments.module.js';
import { ReservationsModule } from './features/reservations/reservations.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { UsersModule } from './features/users/users.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    AuthModule,
    UsersModule,
    RoomsModule,
    ReservationsModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
