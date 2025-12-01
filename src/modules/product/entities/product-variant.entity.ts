import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ProductVariantImage } from 'src/modules/product/entities/product-variant-image.entity';
import { ProductVariantOptionValue } from 'src/modules/product/entities/product-variant-option-value.entity';
import { Product } from 'src/modules/product/entities/product.entity';

@Entity('product_variants')
export class ProductVariant extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ length: 100, unique: true })
  sku: string;

  @Column({ length: 100, nullable: true })
  barcode?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({
    name: 'compare_at_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  compareAtPrice?: number;

  @Column({
    name: 'cost_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  costPrice?: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  length?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  width?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  height?: number;

  @Column({
    name: 'dimension_unit',
    type: 'enum',
    enum: ['cm', 'inch'],
    default: 'cm',
  })
  dimensionUnit: 'cm' | 'inch';

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

  @OneToMany(() => ProductVariantImage, (image) => image.variant)
  images?: ProductVariantImage[];
}
