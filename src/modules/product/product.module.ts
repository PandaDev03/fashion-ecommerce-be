import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ProductOptionValue } from './entities/product-option-value.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductVariantImageMapping } from './entities/product-variant-image-mapping.entity';
import { ProductVariantImage } from './entities/product-variant-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { ProductVariantImageMappingRepository } from './repository/product-variant-image-mapping.repository';
import { ProductVariantImageRepository } from './repository/product-variant-image.repository';
import { ProductVariantRepository } from './repository/product-variant.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductOption,
      ProductVariant,
      ProductOptionValue,
      ProductVariantImage,
      ProductVariantImageMapping,
    ]),
    CloudinaryModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRepository,
    ProductVariantRepository,
    ProductVariantImageRepository,
    ProductVariantImageMappingRepository,
  ],
  exports: [
    ProductService,
    ProductRepository,
    ProductVariantRepository,
    ProductVariantImageRepository,
    ProductVariantImageMappingRepository,
  ],
})
export class ProductModule {}
