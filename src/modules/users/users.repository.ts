import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { IUserQueries } from 'src/common/types/user';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async isEmailExisted(email: string) {
    return (await this.usersRepository.countBy({ email })) > 0;
  }

  async create(createUserDto: CreateUserDto) {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findOne(queries: IUserQueries) {
    const user = await this.usersRepository.findOne({ where: { ...queries } });
    if (!user) throw new NotFoundException(`Không tìm thấy người dùng`);

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.usersRepository.update(id, updateUserDto);

    return this.findOne({ id });
  }

  async remove(id: string) {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0)
      throw new NotFoundException(`User with ID ${id} not found`);
  }
}
