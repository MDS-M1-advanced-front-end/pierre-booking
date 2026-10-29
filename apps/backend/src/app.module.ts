import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { dataSourceOptions } from './database/data-source.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    // Limite par IP sur toutes les routes, large : les pages SSR du front appellent l'API
    // depuis le serveur Astro, donc tous ses visiteurs partagent la même IP. Les routes
    // d'authentification ont une limite plus stricte (@Throttle dans AuthController).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      errorMessage: 'Trop de requêtes, réessayez dans une minute.',
    }),
    // Les trois modules du domaine ; auth dans users, paiements et admin dans reservations
    UsersModule,
    RoomsModule,
    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
