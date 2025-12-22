import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { ProductVariantImage } from './product-variant-image.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product_variant_image_mappings')
@Unique(['variantId', 'imageId'])
export class ProductVariantImageMapping extends BaseEntity {
  @Column({ name: 'variant_id' })
  variantId: string;

  @Column({ name: 'image_id' })
  imageId: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.imageMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant;

  @ManyToOne(() => ProductVariantImage, (image) => image.variantMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'image_id' })
  image?: ProductVariantImage;
}
