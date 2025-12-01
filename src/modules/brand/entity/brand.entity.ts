import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/product/entities/product.entity';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 500, nullable: true })
  logo?: string;

  @OneToMany(() => Product, (product) => product.brand)
  products?: Product[];
}
