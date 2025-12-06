import { Injectable } from '@nestjs/common';

import { BrandRepository } from './brand.repository';
import { GetBrandDto } from './dto/get-brand.dto';

@Injectable()
export class BrandService {
  constructor(private readonly brandRepository: BrandRepository) {}

  async findAll(getBrandDto: GetBrandDto) {
    return await this.brandRepository.findAll(getBrandDto);
  }
}
