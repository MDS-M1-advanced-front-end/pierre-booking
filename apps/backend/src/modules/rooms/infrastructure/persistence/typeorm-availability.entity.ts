import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { TypeOrmRoomEntity } from './typeorm-room.entity.js';

/** Table availabilities. Heures sans fuseau : heure de Paris (cf. docs/cadrage.md). */
@Entity('availabilities')
@Index(['roomId', 'date'])
@Check(`"end_time" > "start_time"`)
export class TypeOrmAvailabilityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  // YYYY-MM-DD
  @Column({ type: 'date' })
  date: string;

  // HH:mm:ss
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @ManyToOne(() => TypeOrmRoomEntity, (room) => room.availabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room: Relation<TypeOrmRoomEntity>;
}
