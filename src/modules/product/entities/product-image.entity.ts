import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ length: 500 })
  url: string;

  @Column({ name: 'alt_text', length: 255, nullable: true })
  altText?: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product?: Product;
}
