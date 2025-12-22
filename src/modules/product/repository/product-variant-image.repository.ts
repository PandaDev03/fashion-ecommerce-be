import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariantImage } from '../entities/product-variant-image.entity';
import { Repository } from 'typeorm';
import { CreateProductVariantImageDto } from '../dto/create-product-variant-image.dto';

@Injectable()
export class ProductVariantImageRepository {
  constructor(
    @InjectRepository(ProductVariantImage)
    private readonly productVariantImageRepository: Repository<ProductVariantImage>,
  ) {}

  async deleteMany(ids: string[]) {
    const result = (await this.productVariantImageRepository.delete(ids))
      .affected;
    return (result ?? 0) > 0;
  }

  async create(
    createProductVariantImageDto: ICreate<CreateProductVariantImageDto>,
  ) {
    const { createdBy, variables } = createProductVariantImageDto;

    const productVariantImage = this.productVariantImageRepository.create({
      createdBy,
      ...variables,
    });
    return await this.productVariantImageRepository.save(productVariantImage);
  }
}
