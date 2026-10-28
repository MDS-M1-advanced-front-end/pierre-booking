import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { RoomStatus } from '../../domain/entities/room.entity.js';
import { decimalTransformer } from '../../../../common/decimal.transformer.js';
import { TypeOrmReservationEntity } from '../../../reservations/infrastructure/persistence/typeorm-reservation.entity.js';
import { TypeOrmUserEntity } from '../../../users/infrastructure/persistence/typeorm-user.entity.js';
import { TypeOrmAvailabilityEntity } from './typeorm-availability.entity.js';

/** Table rooms. */
@Entity('rooms')
@Check(`"capacity" >= 1`)
@Check(`"price_per_hour" >= 0`)
export class TypeOrmRoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'text', array: true, default: '{}' })
  equipment: string[];

  @Column({
    name: 'price_per_hour',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  pricePerHour: number;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.ACTIVE })
  status: RoomStatus;

  @Column({ name: 'image_url', type: 'varchar', length: 2048, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => TypeOrmUserEntity, (user) => user.rooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<TypeOrmUserEntity>;

  @OneToMany(
    () => TypeOrmAvailabilityEntity,
    (availability) => availability.room,
  )
  availabilities: Relation<TypeOrmAvailabilityEntity>[];

  @OneToMany(() => TypeOrmReservationEntity, (reservation) => reservation.room)
  reservations: Relation<TypeOrmReservationEntity>[];
}
