import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { ReservationStatus } from '../features/reservations/reservations.dto.js';
import { decimalTransformer } from './decimal.transformer.js';
import { Payment } from './payments.model.js';
import { TypeOrmRoomEntity as Room } from '../modules/rooms/infrastructure/persistence/typeorm-room.entity.js';
import { User } from './users.model.js';

@Entity('reservations')
@Index(['roomId', 'startAt'])
@Index(['userId'])
@Check(`"end_at" > "start_at"`)
@Check(`"number_of_participants" >= 1`)
@Check(`"total_amount" >= 0`)
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ name: 'number_of_participants', type: 'int', nullable: true })
  numberOfParticipants: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // Figé à la création : le prix de la salle peut changer ensuite
  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({ type: 'char', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // RESTRICT : un utilisateur ou une salle avec des réservations ne se supprime pas (409)
  @ManyToOne(() => User, (user) => user.reservations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne(() => Room, (room) => room.reservations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room: Relation<Room>;

  @OneToOne(() => Payment, (payment) => payment.reservation)
  payment: Relation<Payment> | null;
}
