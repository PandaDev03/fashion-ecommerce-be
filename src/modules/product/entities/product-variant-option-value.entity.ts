import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { ProductOptionValue } from 'src/modules/product/entities/product-option-value.entity';
import { ProductVariant } from 'src/modules/product/entities/product-variant.entity';

@Entity('product_variant_option_values')
@Unique(['variantId', 'optionValueId'])
export class ProductVariantOptionValue extends BaseEntity {
  @Column({ name: 'variant_id' })
  variantId: string;

  @Column({ name: 'option_value_id' })
  optionValueId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.optionValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant;

  @ManyToOne(
    () => ProductOptionValue,
    (optionValue) => optionValue.variantOptionValues,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'option_value_id' })
  optionValue?: ProductOptionValue;
}
