import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GetProductDto } from './dto/get-product.dto';
import { Product } from './entities/product.entity';
import { getSkipTakeParams } from 'src/common/utils/function';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(getProductDto: GetProductDto) {
    const {
      page,
      pageSize,
      search,
      status,
      brandId,
      categoryId,
      brandSlugs,
      categorySlugs,
      createdTo,
      createdFrom,
    } = getProductDto;

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    queryBuilder
      .leftJoinAndSelect('product.creator', 'creator')
      .leftJoinAndSelect('product.updater', 'updater')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.options', 'productOption')
      .leftJoinAndSelect('productOption.values', 'productOptionValue');

    queryBuilder
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
      .leftJoinAndSelect('imageMapping.image', 'variantImage')
      .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
      .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue');

    if (search && search.trim() !== '')
      queryBuilder.andWhere(
        'LOWER(product.name) LIKE :search OR LOWER(product.slug) LIKE :search',
        { search: `%${search.toLowerCase()}%` },
      );

    if (createdFrom)
      queryBuilder.andWhere('product.createdAt >= :createdFrom', {
        createdFrom,
      });

    if (createdTo)
      queryBuilder.andWhere('product.createdAt <= :createdTo', { createdTo });

    if (status) queryBuilder.andWhere('product.status = :status', { status });

    if (brandId)
      queryBuilder.andWhere('product.brandId = :brandId', { brandId });

    if (categoryId)
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });

    if (brandSlugs?.length)
      queryBuilder.andWhere('brand.slug IN (:...brandSlugs)', {
        brandSlugs,
      });

    if (categorySlugs?.length) {
      queryBuilder.leftJoin('category.parent', 'parentCategory');

      queryBuilder.andWhere(
        '(category.slug IN (:...categorySlugs) OR parentCategory.slug IN (:...categorySlugs))',
        { categorySlugs },
      );
    }

    // queryBuilder.orderBy('product.createdAt', 'DESC')
    queryBuilder
      .addOrderBy('productOption.position', 'ASC')
      .addOrderBy('variantOptionValue.position', 'ASC')
      .addOrderBy('productOptionValue.position', 'ASC')
      .addOrderBy('variant.position', 'ASC')
      .addOrderBy('variantImage.position', 'ASC');

    const { skip, take } = getSkipTakeParams({ page, pageSize });
    if (skip !== undefined) queryBuilder.skip(skip);
    if (take !== undefined) queryBuilder.take(take);

    const [products, total] = await queryBuilder.getManyAndCount();
    return { products, total };
  }

  async findBySlug(slug: string) {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('LOWER(product.slug) LIKE :slug', { slug: `%${slug}%` })

      .leftJoinAndSelect('product.creator', 'creator')
      .leftJoinAndSelect('product.updater', 'updater')

      .leftJoin('product.category', 'category')
      .addSelect(['category.id', 'category.name'])

      .leftJoin('product.brand', 'brand')
      .addSelect(['brand.id', 'brand.name'])

      .leftJoinAndSelect('product.images', 'images')

      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
      .leftJoinAndSelect('imageMapping.image', 'variantImage')
      .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
      .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')

      .leftJoinAndSelect('product.options', 'productOption')
      .leftJoinAndSelect('productOption.values', 'productOptionValue')

      .addOrderBy('productOption.position', 'ASC')
      .addOrderBy('variantOptionValue.position', 'ASC')
      .addOrderBy('productOptionValue.position', 'ASC')
      .addOrderBy('variant.position', 'ASC')
      .addOrderBy('variantImage.position', 'ASC');

    const product = await queryBuilder.getOne();

    if (!product || !product.options) return product;

    const colorOption = product.options.find(
      (opt) => opt.name.toLowerCase() === 'màu sắc',
    );

    let variantColorData: { id: string; name: string; count: number }[] = [];

    if (colorOption && colorOption.values)
      variantColorData = colorOption.values.map((val) => {
        const count =
          product.variants?.filter((variant) =>
            variant.optionValues?.some((ov) => ov.optionValue?.id === val.id),
          ).length || 0;

        return {
          id: val.id,
          name: val.value,
          count: count,
        };
      });

    return {
      ...product,
      variantColorData,
    };
  }
}
