import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductVariant } from '../product/entities/product-variant.entity';
import { Product } from '../product/entities/product.entity';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant])],
  providers: [CartService],
  controllers: [CartController],
})
export class CartModule {}
