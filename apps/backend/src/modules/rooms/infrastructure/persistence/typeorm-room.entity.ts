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
import { Availability } from '../../../../models/availabilities.model.js';
import { decimalTransformer } from '../../../../models/decimal.transformer.js';
import { Reservation } from '../../../../models/reservations.model.js';
import { User } from '../../../../models/users.model.js';

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

  @ManyToOne(() => User, (user) => user.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<User>;

  @OneToMany(() => Availability, (availability) => availability.room)
  availabilities: Relation<Availability>[];

  @OneToMany(() => Reservation, (reservation) => reservation.room)
  reservations: Relation<Reservation>[];
}
