import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from 'src/modules/product/entities/product.entity';

@Entity('product_view_history')
@Index(['userIdentifier', 'viewedAt'])
@Index(['productId', 'viewedAt'])
@Index(['userIdentifier', 'productId'])
export class ProductViewHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_identifier',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @Index()
  userIdentifier: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: false })
  productId: string;

  @Column({
    name: 'session_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  sessionId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Source: search, recommendation, category, direct, related',
  })
  source?: string;

  @Column({
    name: 'view_duration_seconds',
    type: 'int',
    nullable: true,
    default: 0,
  })
  viewDurationSeconds?: number;

  @Column({
    name: 'scroll_depth_percent',
    type: 'int',
    nullable: true,
    comment: 'User scroll bao nhiêu % trang product',
  })
  scrollDepthPercent?: number;

  @Column({
    name: 'clicked_images',
    type: 'boolean',
    default: false,
    comment: 'User có click xem ảnh sản phẩm không',
  })
  clickedImages?: boolean;

  @Column({
    name: 'clicked_description',
    type: 'boolean',
    default: false,
    comment: 'User có click đọc mô tả không',
  })
  clickedDescription?: boolean;

  @CreateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;

  @ManyToOne(
    () => Product,
    (product) => (product as any).productViewHistories,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  isRegisteredUser(): boolean {
    return this.userIdentifier.startsWith('user:');
  }

  isGuest(): boolean {
    return this.userIdentifier.startsWith('guest:');
  }

  getUserId(): string | null {
    if (this.isRegisteredUser())
      return this.userIdentifier.replace('user:', '');

    return null;
  }

  getGuestId(): string | null {
    if (this.isGuest()) return this.userIdentifier.replace('guest:', '');

    return null;
  }

  static createUserIdentifier(userId: string): string {
    return `user:${userId}`;
  }

  static createGuestIdentifier(guestId: string): string {
    return `guest:${guestId}`;
  }

  calculateEngagementScore(): number {
    let score = 0;

    // Base score từ view duration (max 50 points)
    score += Math.min((this.viewDurationSeconds || 0) / 10, 50);

    // Scroll depth (max 20 points)
    score += ((this.scrollDepthPercent || 0) / 100) * 20;

    // Interactions (mỗi action +15 points)
    if (this.clickedImages) score += 15;
    if (this.clickedDescription) score += 15;

    return Math.min(score, 100); // Cap at 100
  }
}
