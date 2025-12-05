import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children?: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products?: Product[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updater: User;
}
