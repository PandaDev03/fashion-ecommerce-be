import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';

import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { createPaginatedResponse } from 'src/common/utils/function';
import { GetAllUserDto } from './dto/get-all-user.dto';
import { ChangePasswordDto } from './dto/update-password.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.USER, UserRole.ADMIN)
  async getMe(@Req() req: any, @Res() res: Response) {
    try {
      const user = await this.userService.findOne(req.user.userId);
      if (!user) throw new UnauthorizedException();

      const { password, refreshToken, ...userInfo } = user;

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin người dùng thành công',
        data: {
          userInfo: {
            ...userInfo,
            accountType: user.accountType,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin người dùng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async getAllUser(
    @Res() res: Response,
    @Query() getAllUserDto: GetAllUserDto,
  ) {
    try {
      const { page, pageSize } = getAllUserDto;
      const result = await this.userService.findAll(getAllUserDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin người dùng thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin người dùng thành công',
        ...createPaginatedResponse(
          { page, pageSize },
          result.total,
          result.users,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin người dùng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Roles(UserRole.ADMIN)
  @Put('admin/:id')
  async updateUserByAdmin(
    @Req() req: any,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() updateUserByAdminDto: UpdateUserByAdminDto,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.userService.updateUserByAdmin(id, {
        updatedBy: userId,
        variables: updateUserByAdminDto,
      });

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Cập nhật thông tin người dùng thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Cập nhật thông tin người dùng thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật thông tin người dùng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Put()
  async updateUser(
    @Req() req: any,
    @Res() res: Response,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    try {
      const result = await this.userService.update(
        req.user.userId,
        updateUserDto,
      );

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Cập nhật thông tin người dùng thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Cập nhật thông tin người dùng thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật thông tin người dùng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Put('change-password')
  async changePassword(
    @Req() req: any,
    @Res() res: Response,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      const result = await this.userService.changePassword(
        req.user.userId,
        changePasswordDto,
      );

      if (!result.success) {
        return res.status(400).json({
          statusCode: 400,
          message: result.message,
        });
      }

      return res.status(200).json({
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Đổi mật khẩu thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
