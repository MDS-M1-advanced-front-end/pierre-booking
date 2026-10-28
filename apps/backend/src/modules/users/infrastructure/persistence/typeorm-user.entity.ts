import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { TypeOrmReservationEntity } from '../../../reservations/infrastructure/persistence/typeorm-reservation.entity.js';
import { TypeOrmRoomEntity } from '../../../rooms/infrastructure/persistence/typeorm-room.entity.js';
import { UserRole } from '../../domain/entities/user.entity.js';

@Entity('users')
export class TypeOrmUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => TypeOrmRoomEntity, (room) => room.owner)
  rooms: Relation<TypeOrmRoomEntity>[];

  @OneToMany(() => TypeOrmReservationEntity, (reservation) => reservation.user)
  reservations: Relation<TypeOrmReservationEntity>[];
}
