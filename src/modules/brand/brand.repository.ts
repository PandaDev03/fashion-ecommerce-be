import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GetBrandDto } from './dto/get-brand.dto';
import { Brand } from './entity/brand.entity';

@Injectable()
export class BrandRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async findAll(getBrandDto: GetBrandDto) {
    const { page, pageSize, ...queries } = getBrandDto;

    const queryBuilder = this.brandRepository
      .createQueryBuilder('brand')
      .leftJoinAndSelect('brand.creator', 'creator')
      .leftJoinAndSelect('brand.updater', 'updater');

    queryBuilder.orderBy('brand.createdAt', 'DESC');

    const [brands, total] = await queryBuilder.getManyAndCount();
    return { brands, total };
  }
}
