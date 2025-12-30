import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductViewHistory } from './entity/product-view-history.entity';
import { ProductViewHistoryController } from './product-view-history.controller';
import { ProductViewHistoryService } from './product-view-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductViewHistory])],
  controllers: [ProductViewHistoryController],
  providers: [ProductViewHistoryService],
  exports: [ProductViewHistoryService],
})
export class ProductViewHistoryModule {}
