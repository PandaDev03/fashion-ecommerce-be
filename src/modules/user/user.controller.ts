import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/update-password.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
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

  @Put()
  @UseGuards(AuthGuard('jwt'))
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

  @Put('change-password')
  @UseGuards(AuthGuard('jwt'))
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
