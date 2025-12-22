import { Injectable } from '@nestjs/common';

import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { DeleteManyCategoryDto } from './dto/delete-many-category.dto';
import { GetCategoryDto } from './dto/get-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findById(id: string) {
    return await this.categoryRepository.findById(id);
  }

  async findAll(getCategoryDto: GetCategoryDto) {
    return await this.categoryRepository.findAll(getCategoryDto);
  }

  async findAllParents() {
    return await this.categoryRepository.findAllParents();
  }

  async findOptions() {
    return await this.categoryRepository.findOptions();
  }

  async create(createCategoryDto: ICreate<CreateCategoryDto>) {
    return await this.categoryRepository.create(createCategoryDto);
  }

  async update(updateCategoryDto: IUpdate<UpdateCategoryDto>) {
    return await this.categoryRepository.update(updateCategoryDto);
  }

  async delete(id: string) {
    return await this.categoryRepository.delete(id);
  }

  async deleteMany(deleteManyCategoryDto: DeleteManyCategoryDto) {
    const { ids } = deleteManyCategoryDto;
    return await this.categoryRepository.deleteMany(ids);
  }
}
