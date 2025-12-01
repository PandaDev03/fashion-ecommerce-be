import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ProductOption } from './product-option.entity';
import { ProductVariantOptionValue } from './product-variant-option-value.entity';

@Entity('product_option_values')
export class ProductOptionValue extends BaseEntity {
  @Column({ name: 'option_id' })
  optionId: string;

  @Column({ length: 100 })
  value: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => ProductOption, (option) => option.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'option_id' })
  option?: ProductOption;

  @OneToMany(
    () => ProductVariantOptionValue,
    (variantOptionValue) => variantOptionValue.optionValue,
  )
  variantOptionValues?: ProductVariantOptionValue[];
}
