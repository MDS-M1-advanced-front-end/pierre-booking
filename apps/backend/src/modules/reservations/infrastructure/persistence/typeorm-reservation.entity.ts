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
import { decimalTransformer } from '../../../../common/decimal.transformer.js';
import { TypeOrmRoomEntity } from '../../../rooms/infrastructure/persistence/typeorm-room.entity.js';
import { TypeOrmUserEntity } from '../../../users/infrastructure/persistence/typeorm-user.entity.js';
import { ReservationStatus } from '../../domain/entities/reservation.entity.js';
import { TypeOrmPaymentEntity } from './typeorm-payment.entity.js';

/** Table `reservations` (voir docs/Database.md). */
@Entity('reservations')
@Index(['roomId', 'startAt'])
@Index(['userId'])
@Check(`"end_at" > "start_at"`)
@Check(`"number_of_participants" >= 1`)
@Check(`"total_amount" >= 0`)
export class TypeOrmReservationEntity {
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
  @ManyToOne(() => TypeOrmUserEntity, (user) => user.reservations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: Relation<TypeOrmUserEntity>;

  @ManyToOne(() => TypeOrmRoomEntity, (room) => room.reservations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'room_id' })
  room: Relation<TypeOrmRoomEntity>;

  @OneToOne(() => TypeOrmPaymentEntity, (payment) => payment.reservation)
  payment: Relation<TypeOrmPaymentEntity> | null;
}
