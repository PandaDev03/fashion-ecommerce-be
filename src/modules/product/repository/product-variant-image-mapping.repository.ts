import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariantImageMapping } from '../entities/product-variant-image-mapping.entity';
import { Repository } from 'typeorm';
import { CreateProductVariantImageMappingDto } from '../dto/create-product-variant-image-mapping.dto';

@Injectable()
export class ProductVariantImageMappingRepository {
  constructor(
    @InjectRepository(ProductVariantImageMapping)
    private readonly productVariantImageMappingRepository: Repository<ProductVariantImageMapping>,
  ) {}

  async findByVariantId(variantId: string) {
    return await this.productVariantImageMappingRepository.find({
      where: { variantId },
    });
  }

  async deleteByVariantId(variantId: string) {
    return await this.productVariantImageMappingRepository.delete({
      variantId,
    });
  }

  async create(
    createProductVariantImageMappingDto: ICreate<CreateProductVariantImageMappingDto>,
  ) {
    const { createdBy, variables } = createProductVariantImageMappingDto;

    const productVariantImageMapping =
      this.productVariantImageMappingRepository.create({
        createdBy,
        ...variables,
      });

    return await this.productVariantImageMappingRepository.save(
      productVariantImageMapping,
    );
  }
}
