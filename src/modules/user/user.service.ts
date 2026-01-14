import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateGoogleUserDto } from './dto/create-google-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { UserRole } from 'src/common/enums/role.enum';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(plainPassword: string, hashedPassword: string) {
    return await bcrypt.compare(plainPassword, hashedPassword);
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

  async findAll(getUserDto: GetUserDto) {
    return await this.userRepository.findAll(getUserDto);
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

  async updateUserByAdmin(
    id: string,
    updateUserByAdminDto: IUpdate<UpdateUserByAdminDto>,
  ) {
    const user = await this.userRepository.findOne({ id });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const { updatedBy, variables } = updateUserByAdminDto;
    const { role, isActive } = variables;

    if (role === undefined && isActive === undefined)
      throw new BadRequestException('No data provided for update');

    console.log('isActive', isActive);

    return await this.userRepository.updateRoleAndStatus(id, {
      role,
      isActive,
      updatedBy,
    });
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      return {
        success: false,
        message: 'Không tìm thấy người dùng',
      };
    }

    if (user.password) {
      if (!oldPassword) {
        return {
          success: false,
          message: 'Vui lòng nhập mật khẩu cũ',
        };
      }

      const isOldPasswordValid = await this.comparePassword(
        oldPassword,
        user.password,
      );

      if (!isOldPasswordValid) {
        return {
          success: false,
          message: 'Mật khẩu cũ không chính xác',
        };
      }

      const isSamePassword = await this.comparePassword(
        newPassword,
        user.password,
      );

      if (isSamePassword) {
        return {
          success: false,
          message: 'Mật khẩu mới không được trùng với mật khẩu cũ',
        };
      }
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });

    return {
      success: true,
      message: user.password
        ? 'Đổi mật khẩu thành công'
        : 'Thiết lập mật khẩu thành công',
    };
  }
}
