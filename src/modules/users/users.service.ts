import { Injectable } from '@nestjs/common';

import { handleDatabaseError } from 'src/common/utils/database-error.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    try {
      return await this.usersRepository.create(createUserDto);
    } catch (error) {
      handleDatabaseError(error, 'Create user failed');
    }
  }

  async findAll() {
    try {
      return await this.usersRepository.findAll();
    } catch (error) {
      handleDatabaseError(error, 'Find all user failed');
    }
  }

  async findOne(id: string) {
    try {
      return await this.usersRepository.findOne(id);
    } catch (error) {
      handleDatabaseError(error, 'Find user failed');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      return this.usersRepository.update(id, updateUserDto);
    } catch (error) {
      handleDatabaseError(error, 'Update user failed');
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      await this.usersRepository.remove(id);

      return { message: 'User deleted successfully' };
    } catch (error) {
      handleDatabaseError(error, 'Delete user failed');
    }
  }
}
