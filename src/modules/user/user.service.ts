import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateGoogleUserDto } from './dto/create-google-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async checkEmailExisted(email: string) {
    return await this.userRepository.isEmailExisted(email);
  }

  async setRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  async create(createUserDto: CreateUserDto) {
    const { password, ...user } =
      await this.userRepository.create(createUserDto);

    return user;
  }

  async createGoogleUser(createGoogleUserDto: CreateGoogleUserDto) {
    return await this.userRepository.createGoogleUser(createGoogleUserDto);
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({ email });
  }

  async findOne(id: string) {
    return await this.userRepository.findOne({ id });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return await this.userRepository.update(id, updateUserDto);
  }
}
