import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column()
  birthday: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  address: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  avatar: string;
}
