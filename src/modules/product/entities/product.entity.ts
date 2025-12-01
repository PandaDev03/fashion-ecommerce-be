import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { Brand } from 'src/modules/brand/entity/brand.entity';
import { Category } from 'src/modules/category/entity/category.entity';
import { ProductImage } from 'src/modules/product/entities/product-image.entity';
import { ProductOption } from 'src/modules/product/entities/product-option.entity';
import { ProductVariant } from 'src/modules/product/entities/product-variant.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ name: 'brand_id', nullable: true })
  brandId?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'draft'],
    default: 'draft',
  })
  status: 'active' | 'inactive' | 'draft';

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @ManyToOne(() => Brand, (brand) => brand.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'brand_id' })
  brand?: Brand;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants?: ProductVariant[];

  @OneToMany(() => ProductOption, (option) => option.product)
  options?: ProductOption[];

  @OneToMany(() => ProductImage, (image) => image.product)
  images?: ProductImage[];
}
