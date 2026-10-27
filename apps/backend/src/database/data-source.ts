import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { Availability } from '../models/availabilities.model.js';
import { Payment } from '../models/payments.model.js';
import { Reservation } from '../models/reservations.model.js';
import { Room } from '../models/rooms.model.js';
import { User } from '../models/users.model.js';

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
  entities: [User, Room, Reservation, Availability, Payment],
  // Fichiers compilés : la CLI tourne sur dist/
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
};

export default new DataSource(dataSourceOptions);
