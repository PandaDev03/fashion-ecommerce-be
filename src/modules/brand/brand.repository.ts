import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getSkipTakeParams } from 'src/common/utils/function';
import { CreateBrandDto } from './dto/create-brand.dto';
import { GetBrandDto } from './dto/get-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entity/brand.entity';

@Injectable()
export class BrandRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async findBySlug(slug: string) {
    return await this.brandRepository.findOne({ where: { slug } });
  }

  async findByName(name: string) {
    return await this.brandRepository.findOne({ where: { name } });
  }

  async findAll(getBrandDto: GetBrandDto) {
    const { page, pageSize, search, createdFrom, createdTo } = getBrandDto;

    const queryBuilder = this.brandRepository
      .createQueryBuilder('brand')
      .leftJoinAndSelect('brand.creator', 'creator')
      .leftJoinAndSelect('brand.updater', 'updater');

    if (createdFrom)
      queryBuilder.andWhere('brand.createdAt >= :createdFrom', { createdFrom });

    if (createdTo)
      queryBuilder.andWhere('brand.createdAt <= :createdTo', { createdTo });

    if (search && search.trim() !== '')
      queryBuilder.andWhere(
        'LOWER(brand.name) LIKE :search OR LOWER(brand.slug) LIKE :search',
        { search: `%${search.toLowerCase()}%` },
      );

    queryBuilder.orderBy('brand.createdAt', 'DESC');

    const { skip, take } = getSkipTakeParams({ page, pageSize });
    if (skip !== undefined) queryBuilder.skip(skip);
    if (take !== undefined) queryBuilder.take(take);

    const [brands, total] = await queryBuilder.getManyAndCount();
    return { brands, total };
  }

  async update(updateBrandDto: IUpdate<UpdateBrandDto>) {
    const { updatedBy, variables } = updateBrandDto;
    const { id, name, slug, ...rest } = variables;

    const params = {
      updatedBy,
      name,
      slug,
      ...Object.entries(rest).reduce((prev, current) => {
        const [key, value] = current;

        prev[key] = value || null;
        return prev;
      }, {}),
    };

    const result = (await this.brandRepository.update(id, params)).affected;
    return (result ?? 0) > 0;
  }

  async create(createBrandDto: ICreate<CreateBrandDto>) {
    const { createdBy, variables } = createBrandDto;
    const { slug, name } = variables;

    const existingSlug = await this.findBySlug(slug);
    const existingBrand = await this.findByName(name);

    if (existingSlug) throw new ConflictException(`Slug "${slug}" đã tồn tại`);
    if (existingBrand)
      throw new ConflictException(`Thương hiệu "${slug}" đã tồn tại`);

    const brand = await this.brandRepository.create({
      createdBy,
      ...variables,
    });
    return await this.brandRepository.save(brand);
  }

  async delete(id: string) {
    const result = (await this.brandRepository.delete(id)).affected;
    return (result ?? 0) > 0;
  }

  async deleteMany(ids: string[]) {
    const result = (await this.brandRepository.delete(ids)).affected;
    return result ?? 0;
  }
}
