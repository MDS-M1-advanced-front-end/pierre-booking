import { join } from 'node:path';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DateScalar } from './common/date.scalar';
import { AppThrottlerGuard } from './common/throttler.guard';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';
import { dataSourceOptions } from './database/data-source';

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
    // API GraphQL de l'administration (tableaux de bord), à côté du REST : POST /api/graphql.
    // Schéma : admin.graphql du core, copié dans dist/graphql au build (lien src/graphql).
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(import.meta.dirname, 'graphql', '*.graphql')],
      useGlobalPrefix: true,
      // Requête et réponse Express, lues par AuthGuard et le throttler (common/request-context.ts)
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      // Filtre global aussi sur les @ResolveField : sans lui, une erreur de validation y perd son
      // code, et le message brut d'une erreur SQL serait renvoyé au client
      fieldResolverEnhancers: ['filters'],
      // Le schéma n'est pas secret (dépôt core), mais inutile de le servir en production ;
      // GraphiQL (landing page) n'est actif qu'en développement, réglage par défaut du driver
      introspection: process.env.NODE_ENV !== 'production',
      // Jamais de pile d'appels dans les réponses (Apollo l'ajoute hors production)
      includeStacktraceInErrorResponses: false,
    }),
    // Les trois modules du domaine ; auth dans users, paiements et admin dans reservations
    UsersModule,
    RoomsModule,
    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DateScalar,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
