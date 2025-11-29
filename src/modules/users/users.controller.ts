import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any, @Res() res: Response) {
    try {
      const user = await this.usersService.findOne(req.user.userId);
      if (!user) throw new UnauthorizedException();

      const { password, refreshToken, ...userInfo } = user;

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin người dùng thành công',
        data: { userInfo },
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin người dùng thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
