import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async checkEmailExisted(email: string) {
    return await this.usersRepository.isEmailExisted(email);
  }

  async setRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: null });
  }

  async create(createUserDto: CreateUserDto) {
    const { password, ...user } =
      await this.usersRepository.create(createUserDto);

    return user;
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findOne({ email });
  }

  async findOne(id: string) {
    return await this.usersRepository.findOne({ id });
  }
}
