import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { OrderDetail } from 'src/modules/order-details/entity/order-details.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ name: 'order_number', length: 50, unique: true })
  orderNumber: string;

  @Column({ name: 'customer_name', length: 255 })
  customerName: string;

  @Column({ name: 'customer_address', length: 500 })
  customerAddress: string;

  @Column({ name: 'customer_phone', length: 20 })
  customerPhone: string;

  @Column({ name: 'customer_email', length: 255 })
  customerEmail: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal: number;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    nullable: true,
    precision: 15,
    scale: 2,
    default: 0,
  })
  shippingFee?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipping',
      'delivered',
      'cancelled',
    ],
    default: 'pending',
  })
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipping'
    | 'delivered'
    | 'cancelled';

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid',
  })
  paymentStatus: 'unpaid' | 'paid' | 'refunded';

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['cod', 'bank_transfer', 'credit_card', 'e_wallet'],
    default: 'cod',
  })
  paymentMethod: 'cod' | 'bank_transfer' | 'credit_card' | 'e_wallet';

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => OrderDetail, (detail) => detail.order, {
    cascade: true,
  })
  orderDetails?: OrderDetail[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updater?: User;
}
