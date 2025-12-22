import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ProductVariantImageMapping } from './product-variant-image-mapping.entity';
import { ProductVariantOptionValue } from './product-variant-option-value.entity';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @OneToMany(
    () => ProductVariantOptionValue,
    (variantOptionValue) => variantOptionValue.variant,
  )
  optionValues?: ProductVariantOptionValue[];

  // @OneToMany(() => ProductVariantImage, (image) => image.variant)
  // images?: ProductVariantImage[];

  @OneToMany(() => ProductVariantImageMapping, (mapping) => mapping.variant)
  imageMappings?: ProductVariantImageMapping[];
}
