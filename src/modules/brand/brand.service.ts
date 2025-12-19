import { Injectable, NotFoundException } from '@nestjs/common';

import { BrandRepository } from './brand.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { DeleteBrandDto } from './dto/delete-brand.dto';
import { DeleteManyBrandDto } from './dto/delete-many-brand.dto';
import { GetBrandDto } from './dto/get-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(private readonly brandRepository: BrandRepository) {}

  async findAll(getBrandDto: GetBrandDto) {
    return await this.brandRepository.findAll(getBrandDto);
  }

  async findOptions() {
    return await this.brandRepository.findOptions();
  }

  async create(createBrandDto: ICreate<CreateBrandDto>) {
    return await this.brandRepository.create(createBrandDto);
  }

  async update(updateBrandDto: IUpdate<UpdateBrandDto>) {
    return await this.brandRepository.update(updateBrandDto);
  }

  async delete(deleteBrandDto: DeleteBrandDto) {
    return await this.brandRepository.delete(deleteBrandDto.id);
  }

  async deleteMany(deleteManyBrandDto: DeleteManyBrandDto) {
    console.log('deleteManyBrandDto', deleteManyBrandDto);

    const { ids } = deleteManyBrandDto;
    const affectedCount = await this.brandRepository.deleteMany(ids);

    if (affectedCount === 0) {
      throw new NotFoundException(
        'Không tìm thấy bất kỳ thương hiệu nào để xóa.',
      );
    }

    return affectedCount;
  }
}
