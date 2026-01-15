import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';

import { UserRole } from 'src/common/enums/role.enum';
import { CreateGoogleUserDto } from './dto/create-google-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ExportUsersDto } from './dto/export-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { ChangePasswordDto } from './dto/update-password.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';

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

  async exportUsersToExcel(dto: ExportUsersDto): Promise<Buffer> {
    const { search, role, isActive, accountType } = dto;
    const filter = { search, role, isActive, accountType };

    const users = await this.userRepository.findAllForExport(filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Tên', key: 'name', width: 25 },
      { header: 'Số điện thoại', key: 'phone', width: 15 },
      { header: 'Ngày sinh', key: 'birthday', width: 15 },
      { header: 'Địa chỉ', key: 'address', width: 35 },
      { header: 'Vai trò', key: 'role', width: 12 },
      { header: 'Loại tài khoản', key: 'accountType', width: 15 },
      { header: 'Trạng thái', key: 'isActive', width: 12 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        birthday: user.birthday || '',
        address: user.address || '',
        role: user.role === UserRole.ADMIN ? 'Admin' : 'User',
        accountType: user.accountType === 'system' ? 'Hệ thống' : 'Google',
        isActive: user.isActive ? 'Hoạt động' : 'Không hoạt động',
        createdAt: user.createdAt
          ? new Date(user.createdAt).toLocaleString('vi-VN')
          : '',
      });
    });

    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: 'middle' };
    });

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
