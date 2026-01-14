import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateGoogleUserDto } from './dto/create-google-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entity/user.entity';
import { GetAllUserDto } from './dto/get-all-user.dto';
import { getSkipTakeParams } from 'src/common/utils/function';
import { UserRole } from 'src/common/enums/role.enum';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async isEmailExisted(email: string) {
    return (await this.userRepository.countBy({ email })) > 0;
  }

  async create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async createGoogleUser(createGoogleUser: CreateGoogleUserDto) {
    const user = this.userRepository.create(createGoogleUser);
    return await this.userRepository.save(user);
  }

  async findOne(getUserDto: GetUserDto) {
    const { page, pageSize, ...queries } = getUserDto;
    const user = await this.userRepository.findOne({
      where: { ...queries },
      select: [
        'id',
        'name',
        'email',
        'password',
        'birthday',
        'phone',
        'address',
        'avatar',
        'role',
        'isActive',
        'createdAt',
        'createdBy',
        'updatedAt',
        'updatedBy',
        'refreshToken',
      ],
    });
    // if (!user) throw new NotFoundException(`Không tìm thấy người dùng`);

    return user;
  }

  async findAll(getAllUserDto: GetAllUserDto) {
    const { page, pageSize, search, createdFrom, createdTo } = getAllUserDto;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (createdFrom)
      queryBuilder.andWhere('user.createdAt >= :createdFrom', { createdFrom });

    if (createdTo)
      queryBuilder.andWhere('user.createdAt <= :createdTo', { createdTo });

    if (search && search.trim() !== '')
      queryBuilder.andWhere('LOWER(user.name) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const { skip, take } = getSkipTakeParams({ page, pageSize });
    if (skip !== undefined) queryBuilder.skip(skip);
    if (take !== undefined) queryBuilder.take(take);

    const [users, total] = await queryBuilder.getManyAndCount();
    return { users, total };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    await this.userRepository.update(id, updateUserDto);
    return this.findOne({ id });
  }

  async updateRoleAndStatus(
    id: string,
    data: { role?: UserRole; isActive?: boolean; updatedBy: string },
  ) {
    await this.userRepository.update(id, data);
    return this.findOne({ id });
  }

  async remove(id: string) {
    const result = await this.userRepository.delete(id);

    if (result.affected === 0)
      throw new NotFoundException(`User with ID ${id} not found`);
  }
}
