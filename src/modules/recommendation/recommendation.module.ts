import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductViewHistory } from '../product-view-history/entity/product-view-history.entity';
import { Product } from '../product/entities/product.entity';
import { RecommendationController } from './recommendation.controller';
import { RecommendationCron } from './recommendation.cron';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ProductViewHistory, Product]),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService, RecommendationCron],
  exports: [RecommendationService],
})
export class RecommendationModule {}
