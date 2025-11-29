import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (user && isPasswordValid) {
      const { password, refreshToken, ...result } = user;
      return result as User;
    }

    return null;
  }

  async getAccessToken(userId: string, userName: string): Promise<string> {
    const payload = { sub: userId, username: userName };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async getAndSaveRefreshToken(userId: string): Promise<string> {
    const payload = { sub: userId };

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(refreshToken, salt);
    await this.usersService.setRefreshToken(userId, hashedToken);

    return refreshToken;
  }

  async signUp(signUpDto: SignUpDto) {
    const { password, ...user } = signUpDto;
    const hashedPassword = await this.hashPassword(password);

    return await this.usersService.create({
      ...user,
      password: hashedPassword,
    });
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const currentUser = await this.usersService.findByEmail(email);

    if (!password) throw new BadRequestException('Vui lòng cung cấp mật khẩu');
    if (!currentUser)
      throw new BadRequestException('Không tìm thấy thông tin người dùng');

    const isPasswordValid = await this.comparePassword(
      password,
      currentUser?.password,
    );

    if (!isPasswordValid)
      throw new BadRequestException('Mật khẩu không chính xác');

    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(currentUser.id, currentUser.name),
      this.getAndSaveRefreshToken(currentUser.id),
    ]);
    return { accessToken, refreshToken };
  }
}
