import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getSkipTakeParams } from 'src/common/utils/function';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetCategoryDto } from './dto/get-category.dto';
import { Category } from './entity/category.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findById(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category)
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);

    return category;
  }

  async findBySlug(slug: string) {
    return await this.categoryRepository.findOne({
      where: { slug },
    });
  }

  async findByPosition(position: number) {
    return await this.categoryRepository.findOne({ where: { position } });
  }

  async findAll(getCategoryDto: GetCategoryDto) {
    const { page, pageSize, search, parentIds, ...queries } = getCategoryDto;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.creator', 'creator')
      .leftJoinAndSelect('category.updater', 'updater');

    console.log('parentIds', parentIds);

    if (parentIds && parentIds.length > 0)
      queryBuilder.andWhere('category.parent_id IN (:...parentIds)', {
        parentIds,
      });

    console.log('queries', queries);

    Object.entries(queries).forEach(([key, value]) => {
      if (value !== undefined && value !== null)
        queryBuilder.andWhere(`category.${key} = :${key}`, { [key]: value });
    });

    if (search && search.trim() !== '')
      queryBuilder.andWhere(
        '(category.name LIKE :search OR category.slug LIKE :search)',
        { search: `%${search}%` },
      );

    queryBuilder.loadRelationCountAndMap(
      'category.childrenCount',
      'category.children',
    );

    queryBuilder.orderBy('category.createdAt', 'DESC');

    const { skip, take } = getSkipTakeParams({ page, pageSize });
    if (skip !== undefined) queryBuilder.skip(skip);
    if (take !== undefined) queryBuilder.take(take);

    const [categories, total] = await queryBuilder.getManyAndCount();
    return { categories, total };
  }

  async findAllParents() {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .select([
        'category.id',
        'category.name',
        'category.slug',
        'category.position',
      ])
      .loadRelationCountAndMap('category.childrenCount', 'category.children')
      .orderBy('category.position', 'ASC');

    return await queryBuilder.getMany();
  }

  async create(
    createCategoryDto: ICreate<CreateCategoryDto>,
  ): Promise<Category> {
    const { createdBy, variables } = createCategoryDto;
    const { parentId, position, slug } = variables;

    const existingCategory = await this.findBySlug(slug);
    const existingPosition = await this.findByPosition(position);

    if (existingCategory)
      throw new ConflictException(`Slug "${slug}" đã tồn tại`);

    if (existingPosition)
      throw new ConflictException(`Vị trí "${position}" đã tồn tại`);

    if (parentId) await this.findById(parentId);

    const category = this.categoryRepository.create({
      createdBy,
      ...variables,
    });
    return await this.categoryRepository.save(category);
  }

  async update(updateCategoryDto: IUpdate<UpdateCategoryDto>) {
    const { updatedBy, variables } = updateCategoryDto;
    const { id, description, parentId, ...params } = variables;

    const updateParams = {
      ...params,
      parentId: parentId || null,
      description: description || null,
      updatedBy,
    };

    const result = (await this.categoryRepository.update(id, updateParams))
      .affected;

    return (result ?? 0) > 0;
  }

  async delete(id: string) {
    const result = (await this.categoryRepository.delete(id)).affected;
    return (result ?? 0) > 0;
  }
}
