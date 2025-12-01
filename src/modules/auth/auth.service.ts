import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { User } from '../user/entity/user.entity';
import { UserService } from '../user/user.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );
  }

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException(`Không tìm thấy người dùng`);

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
    await this.userService.setRefreshToken(userId, hashedToken);

    return refreshToken;
  }

  async verifyGoogleToken(accessToken: string) {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const { email, name, picture } = response.data;

      if (!email)
        throw new BadRequestException(
          'Không lấy được thông tin email từ Google',
        );

      return {
        email,
        name,
        avatar: picture,
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new BadRequestException('Google token không hợp lệ');
    }
  }

  async signUp(signUpDto: SignUpDto) {
    const { password, ...user } = signUpDto;
    const hashedPassword = await this.hashPassword(password);

    return await this.userService.create({
      ...user,
      password: hashedPassword,
    });
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const currentUser = await this.userService.findByEmail(email);

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

  async googleSignIn(email: string) {
    const currentUser = await this.userService.findByEmail(email);
    if (!currentUser) throw new NotFoundException(`Không tìm thấy người dùng`);

    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(currentUser.id, currentUser.name),
      this.getAndSaveRefreshToken(currentUser.id),
    ]);

    return { accessToken, refreshToken };
  }

  async findOrCreateGoogleUser(googleUser: {
    email: string;
    name: string;
    avatar: string;
  }) {
    const { email, name, avatar } = googleUser;
    const currentUser = await this.userService.findByEmail(email);

    let result = currentUser;

    if (!result) {
      result = await this.userService.createGoogleUser({
        email,
        name,
        avatar,
      });
    } else if (!result.avatar) {
      const { id } = result;
      result = await this.userService.update(id, { avatar });
    }

    return result;
  }
}
