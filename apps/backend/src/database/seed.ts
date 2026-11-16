// Remplit la base avec le jeu de données du mock (mock/data/*.json) : mêmes ids, mêmes comptes.
// Vide d'abord toutes les tables : à réserver au développement. Usage : pnpm seed
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDays } from '../common/paris-time';
import type { ReservationStatus } from '../modules/reservations/domain/entities/reservation.entity';
import type { RoomStatus } from '../modules/rooms/domain/entities/room.entity';
import type { UserRole } from '../modules/users/domain/entities/user.entity';
import { ScryptPasswordHasher } from '../modules/users/infrastructure/security/scrypt-password-hasher';
import { TypeOrmReservationEntity } from '../modules/reservations/infrastructure/persistence/typeorm-reservation.entity';
import { TypeOrmPaymentEntity } from '../modules/reservations/infrastructure/persistence/typeorm-payment.entity';
import { TypeOrmAvailabilityEntity } from '../modules/rooms/infrastructure/persistence/typeorm-availability.entity';
import { TypeOrmRoomEntity } from '../modules/rooms/infrastructure/persistence/typeorm-room.entity';
import { TypeOrmUserEntity } from '../modules/users/infrastructure/persistence/typeorm-user.entity';
import dataSource from './data-source';

interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface MockRoom {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  location: string;
  equipment?: string[];
  pricePerHour: number;
  status: RoomStatus;
  ownerId: string;
  imageUrl?: string;
  createdAt: string;
}

interface MockReservation {
  id: string;
  roomId: string;
  userId: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  numberOfParticipants?: number;
  comment?: string;
  totalAmount: number;
  createdAt: string;
}

interface MockSlot {
  startTime: string;
  endTime: string;
}

// Créneaux ouverts pour chaque salle active, à partir d'aujourd'hui
const AVAILABILITY_DAYS = 60;

// src/database ou dist/database → racine du dépôt
const MOCK_DATA_DIR = join(import.meta.dirname, '../../../../mock/data');

function readMock<T>(name: string): T[] {
  return JSON.parse(
    readFileSync(join(MOCK_DATA_DIR, `${name}.json`), 'utf8'),
  ) as T[];
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed refusé en production : il vide toutes les tables.');
  }
  const users = readMock<MockUser>('users');
  const rooms = readMock<MockRoom>('rooms');
  const reservations = readMock<MockReservation>('reservations');
  // Le mock renvoie la même journée pour toutes les salles ; « available: false » y marque des
  // créneaux réservés, calculés ici à partir des réservations : tous les créneaux sont ouverts.
  const slots = readMock<MockSlot>('availability');
  const passwordHash = await new ScryptPasswordHasher().hash(
    process.env.SEED_PASSWORD || 'motdepasse',
  );

  await dataSource.initialize();
  await dataSource.transaction(async (manager) => {
    await manager.query(
      'TRUNCATE payments, reservations, availabilities, rooms, users',
    );

    await manager.insert(
      TypeOrmUserEntity,
      users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        passwordHash,
        role: user.role,
        createdAt: new Date(user.createdAt),
      })),
    );

    await manager.insert(
      TypeOrmRoomEntity,
      rooms.map((room) => ({
        id: room.id,
        ownerId: room.ownerId,
        name: room.name,
        description: room.description ?? null,
        capacity: room.capacity,
        location: room.location,
        equipment: room.equipment ?? [],
        pricePerHour: room.pricePerHour,
        status: room.status,
        imageUrl: room.imageUrl ?? null,
        createdAt: new Date(room.createdAt),
      })),
    );

    const today = new Date().toISOString().slice(0, 10);
    const availabilities = rooms.flatMap((room) =>
      Array.from({ length: AVAILABILITY_DAYS }, (_, day) =>
        slots.map((slot) => ({
          roomId: room.id,
          date: addDays(today, day),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: true,
        })),
      ).flat(),
    );
    // Par lots : PostgreSQL limite le nombre de paramètres d'une requête
    for (let i = 0; i < availabilities.length; i += 1000) {
      await manager.insert(
        TypeOrmAvailabilityEntity,
        availabilities.slice(i, i + 1000),
      );
    }

    await manager.insert(
      TypeOrmReservationEntity,
      reservations.map((reservation) => ({
        id: reservation.id,
        roomId: reservation.roomId,
        userId: reservation.userId,
        startAt: new Date(reservation.startAt),
        endAt: new Date(reservation.endAt),
        status: reservation.status,
        numberOfParticipants: reservation.numberOfParticipants ?? null,
        comment: reservation.comment ?? null,
        totalAmount: reservation.totalAmount,
        createdAt: new Date(reservation.createdAt),
      })),
    );
  });

  const counts = await Promise.all(
    [
      TypeOrmUserEntity,
      TypeOrmRoomEntity,
      TypeOrmAvailabilityEntity,
      TypeOrmReservationEntity,
      TypeOrmPaymentEntity,
    ].map(
      async (entity) =>
        `${dataSource.getMetadata(entity).tableName} : ${await dataSource.getRepository(entity).count()}`,
    ),
  );
  console.log(
    `Seed terminé (mot de passe des comptes : SEED_PASSWORD).\n${counts.join('\n')}`,
  );
  await dataSource.destroy();
}

await seed();
