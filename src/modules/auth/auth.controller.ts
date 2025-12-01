import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(maxAge: number, isProd: boolean) {
    return {
      httpOnly: true,
      secure: isProd,
      maxAge: maxAge,
      sameSite: 'lax' as const,
    };
  }

  @Post('/sign-up')
  async signUp(
    @Res() res: Response,
    @Body(ValidationPipe) signUpDto: SignUpDto,
  ) {
    try {
      const isEmailExisted = await this.usersService.checkEmailExisted(
        signUpDto.email,
      );

      if (isEmailExisted)
        return res
          .status(400)
          .json({ statusCode: 400, message: 'Email đã được sử dụng' });

      const result = await this.authService.signUp(signUpDto);

      return res.status(200).json({
        statusCode: 200,
        message: 'Đăng ký tài khoản thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Đăng ký thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Post('/sign-in')
  async signIn(
    @Res() res: Response,
    @Body(ValidationPipe) signInDto: SignInDto,
  ) {
    try {
      const { email, password } = signInDto;

      const expiresIn = this.configService.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      );

      const user = await this.authService.validateUser(email, password);
      if (!user)
        throw new UnauthorizedException('Sai tên tài khoản hoặc mật khẩu');

      const result = await this.authService.signIn(signInDto);
      console.log('sign in result', result);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Đăng nhập thất bại: Sai tên tài khoản hoặc mật khẩu!',
        });

      const isProd =
        this.configService.get<string>('NODE_ENV') === 'production';
      const maxAge = 7 * 24 * 60 * 60 * 1000;

      res.cookie(
        'refreshToken',
        result.refreshToken,
        this.getCookieOptions(maxAge, isProd),
      );

      return res.status(200).json({
        statusCode: 200,
        message: 'Đăng nhập thành công',
        data: { accessToken: result.accessToken },
      });
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      )
        throw error;

      return res.status(500).json({
        statusCode: 500,
        message: `Đăng nhập thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refreshTokens(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, userName } = req.user;

    console.log(req.user);

    const newAccessToken = await this.authService.getAccessToken(
      userId,
      userName,
    );
    const newRefreshToken =
      await this.authService.getAndSaveRefreshToken(userId);

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    res.cookie(
      'refreshToken',
      newRefreshToken,
      this.getCookieOptions(maxAge, isProd),
    );

    return res.status(200).json({
      statusCode: 200,
      message: 'Làm mới token thành công',
      data: { accessToken: newAccessToken },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('sign-out')
  async signOut(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.usersService.removeRefreshToken(req.user.userId);

    res.clearCookie('refreshToken');

    return res
      .status(200)
      .json({ statusCode: 200, message: 'Đăng xuất thành công' });
  }
}
