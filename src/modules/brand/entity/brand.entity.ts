import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({ length: 255, unique: true })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ length: 500, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  facebook?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  instagram?: string | null;

  @OneToMany(() => Product, (product) => product.brand)
  products?: Product[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updater: User;
}
