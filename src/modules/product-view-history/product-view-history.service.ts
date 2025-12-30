import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductViewHistory } from './entity/product-view-history.entity';

@Injectable()
export class ProductViewHistoryService {
  constructor(
    @InjectRepository(ProductViewHistory)
    private viewHistoryRepo: Repository<ProductViewHistory>,
  ) {}

  async trackView(
    userIdentifier: string,
    productId: string,
    metadata: {
      sessionId?: string;
      source?: string;
      viewDurationSeconds?: number;
      scrollDepthPercent?: number;
      clickedImages?: boolean;
      clickedDescription?: boolean;
    },
  ): Promise<ProductViewHistory> {
    const viewHistory = this.viewHistoryRepo.create({
      userIdentifier,
      productId,
      ...metadata,
    });

    return this.viewHistoryRepo.save(viewHistory);
  }

  async getUserHistory(
    userIdentifier: string,
    limit: number = 50,
  ): Promise<ProductViewHistory[]> {
    return this.viewHistoryRepo.find({
      where: { userIdentifier },
      order: { viewedAt: 'DESC' },
      take: limit,
      relations: ['product'],
    });
  }
}
