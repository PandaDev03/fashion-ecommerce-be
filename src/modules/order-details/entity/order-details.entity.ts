import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { Order } from 'src/modules/order/entity/order.entity';
import { ProductVariant } from 'src/modules/product/entities/product-variant.entity';
import { Product } from 'src/modules/product/entities/product.entity';

@Entity('order_details')
export class OrderDetail extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_variant_id', nullable: true })
  productVariantId?: string;

  @Column({ name: 'product_name', length: 255 })
  productName: string;

  @Column({ name: 'variant_attributes', type: 'json', nullable: true })
  variantAttributes?: {
    [key: string]: string;
  };

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2 })
  totalPrice: number;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string;

  @ManyToOne(() => Order, (order) => order.orderDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @ManyToOne(() => Product, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => ProductVariant, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant?: ProductVariant;
}
