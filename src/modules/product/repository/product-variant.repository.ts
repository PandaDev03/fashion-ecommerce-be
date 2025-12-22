import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariant } from '../entities/product-variant.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProductVariantRepository {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
  ) {}

  async findByVariantId(variantId: string) {
    return await this.productVariantRepository
      .createQueryBuilder('variant')
      .where('variant.id = :variantId', { variantId })
      .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
      .leftJoinAndSelect('imageMapping.image', 'image')
      .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
      .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')
      .orderBy('image.position', 'ASC')
      .getOne();
  }
}
