import '../env';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { TypeOrmReservationEntity } from '../modules/reservations/infrastructure/persistence/typeorm-reservation.entity';
import { TypeOrmPaymentEntity } from '../modules/reservations/infrastructure/persistence/typeorm-payment.entity';
import { TypeOrmAvailabilityEntity } from '../modules/rooms/infrastructure/persistence/typeorm-availability.entity';
import { TypeOrmRoomEntity } from '../modules/rooms/infrastructure/persistence/typeorm-room.entity';
import { TypeOrmUserEntity } from '../modules/users/infrastructure/persistence/typeorm-user.entity';

// Partagée par l'application (app.module.ts) et la CLI TypeORM (scripts migration:*)
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'resa_user',
  password: process.env.DB_PASSWORD || 'resa_password',
  database: process.env.DB_NAME || 'resa_db',
  // Ids générés par gen_random_uuid(), natif depuis PostgreSQL 13 (pas d'extension uuid-ossp)
  uuidExtension: 'pgcrypto',
  synchronize: false, // OBLIGATOIRE : Utilisation stricte des migrations en production/M
  entities: [
    TypeOrmUserEntity,
    TypeOrmRoomEntity,
    TypeOrmAvailabilityEntity,
    TypeOrmReservationEntity,
    TypeOrmPaymentEntity,
  ],
  // Fichiers compilés : la CLI tourne sur dist/
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
};

export default new DataSource(dataSourceOptions);
