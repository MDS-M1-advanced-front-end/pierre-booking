import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { TypeOrmReservationEntity } from '../../../reservations/infrastructure/persistence/typeorm-reservation.entity';
import { TypeOrmRoomEntity } from '../../../rooms/infrastructure/persistence/typeorm-room.entity';
import { UserRole } from '../../domain/entities/user.entity';

/**
 * Table `users`. Entité de persistance : le domaine manipule User (domain/entities).
 */
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

  @Column({
    name: 'password_changed_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  passwordChangedAt: Date;

  @OneToMany(() => TypeOrmRoomEntity, (room) => room.owner)
  rooms: Relation<TypeOrmRoomEntity>[];

  @OneToMany(() => TypeOrmReservationEntity, (reservation) => reservation.user)
  reservations: Relation<TypeOrmReservationEntity>[];
}
