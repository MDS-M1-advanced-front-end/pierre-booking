import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity.js';
import { decimalTransformer } from '../../../../common/decimal.transformer.js';
import { TypeOrmReservationEntity } from './typeorm-reservation.entity.js';

/** Table `payments` (voir docs/Database.md). */
@Entity('payments')
@Check(`"amount" >= 0`)
export class TypeOrmPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Unique (posé par la relation OneToOne) : une réservation a au plus un paiement (MCD 0,1)
  @Column({ name: 'reservation_id', type: 'uuid' })
  reservationId: string;

  @Column({
    name: 'external_transaction_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalTransactionId: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({ type: 'char', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    name: 'payment_url',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  paymentUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToOne(
    () => TypeOrmReservationEntity,
    (reservation) => reservation.payment,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'reservation_id' })
  reservation: Relation<TypeOrmReservationEntity>;
}
