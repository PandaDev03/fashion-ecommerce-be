import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ProductOptionValue } from './product-option-value.entity';
import { Product } from './product.entity';

@Entity('product_options')
export class ProductOption extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Product, (product) => product.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @OneToMany(() => ProductOptionValue, (value) => value.option)
  values?: ProductOptionValue[];
}
