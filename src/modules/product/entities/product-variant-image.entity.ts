import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product_variant_images')
export class ProductVariantImage extends BaseEntity {
  @Column({ name: 'variant_id' })
  variantId: string;

  @Column({ length: 500 })
  url: string;

  @Column({ name: 'alt_text', length: 255, nullable: true })
  altText?: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant;
}
