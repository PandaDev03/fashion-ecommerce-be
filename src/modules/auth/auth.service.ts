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

import { MailService } from '../mail/mail.service';
import { User } from '../user/entity/user.entity';
import { UserService } from '../user/user.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
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

  async getAccessToken(
    userId: string,
    userName: string,
    role: string,
  ): Promise<string> {
    const payload = { sub: userId, username: userName, role: role };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async getAndSaveRefreshToken(userId: string): Promise<string> {
    const payload = { sub: userId }; // role?

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
      this.getAccessToken(currentUser.id, currentUser.name, currentUser.role),
      this.getAndSaveRefreshToken(currentUser.id),
    ]);
    return { accessToken, refreshToken };
  }

  async googleSignIn(email: string) {
    const currentUser = await this.userService.findByEmail(email);
    if (!currentUser) throw new NotFoundException(`Không tìm thấy người dùng`);

    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(currentUser.id, currentUser.name, currentUser.role),
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

  // ==================== COPY 4 METHODS NÀY VÀO auth.service.ts ====================

  /**
   * Tạo JWT reset password token
   * Token chứa: userId, email, purpose: 'reset-password'
   * Expiry: 15 phút
   */
  private async createResetPasswordToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email: email,
      purpose: 'reset-password',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
      expiresIn: '15m',
    });
  }

  /**
   * Verify JWT reset password token
   * Returns: { userId, email }
   */
  private async verifyResetPasswordToken(
    token: string,
  ): Promise<{ userId: string; email: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
      });

      if (payload.purpose !== 'reset-password')
        throw new BadRequestException('Token không hợp lệ');

      return {
        userId: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError')
        throw new BadRequestException(
          'Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới',
        );

      throw new BadRequestException('Token không hợp lệ');
    }
  }

  /**
   * Gửi email chứa link reset password với JWT token
   */
  private async sendResetPasswordEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // const mailOptions = {
    //   from: this.configService.get<string>('MAIL_FROM'),
    //   to: email,
    //   subject: 'Đặt lại mật khẩu',
    //   html: `
    //   <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
    //     <h2 style="color: #333;">Đặt lại mật khẩu</h2>
    //     <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào nút bên dưới để tiếp tục:</p>

    //     <div style="text-align: center; margin: 30px 0;">
    //       <a href="${resetUrl}"
    //          style="background-color: #4CAF50;
    //                 color: white;
    //                 padding: 12px 30px;
    //                 text-decoration: none;
    //                 border-radius: 5px;
    //                 display: inline-block;
    //                 font-weight: bold;">
    //         Đặt lại mật khẩu
    //       </a>
    //     </div>

    //     <p style="color: #666; font-size: 14px;">
    //       Hoặc copy link sau vào trình duyệt:
    //     </p>
    //     <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; font-size: 12px;">
    //       ${resetUrl}
    //     </p>

    //     <p style="color: #999; font-size: 12px; margin-top: 30px;">
    //       Link này có hiệu lực trong <strong>15 phút</strong>.<br>
    //       Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
    //     </p>
    //   </div>
    // `,
    // };

    try {
      // await this.mailService['mailerService'].sendMail(mailOptions);
      await this.mailService.sendResetPasswordEmail(email, resetUrl);
    } catch (error) {
      console.error('Failed to send reset password email:', error);

      throw new BadRequestException(
        'Không thể gửi email. Vui lòng thử lại sau',
      );
    }
  }

  /**
   * Yêu cầu reset password - Tạo JWT token và gửi email
   * PUBLIC method - được gọi từ controller
   */
  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ email });
    if (!user)
      throw new BadRequestException('Email không tồn tại trong hệ thống');

    if (!user.password)
      throw new BadRequestException(
        'Tài khoản Google không thể đổi mật khẩu. Vui lòng sử dụng Google để đăng nhập',
      );

    const resetToken = await this.createResetPasswordToken(user.id, user.email);
    await this.sendResetPasswordEmail(email, resetToken);
  }

  /**
   * Reset password với JWT token
   * PUBLIC method - được gọi từ controller
   */
  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const { userId, email } = await this.verifyResetPasswordToken(token);

    const user = await this.userRepository.findOne({ email });
    if (!user || user.id !== userId)
      throw new BadRequestException('Không tìm thấy người dùng');

    if (!user.password)
      throw new BadRequestException('Tài khoản Google không thể đổi mật khẩu');

    const hashedPassword = await this.hashPassword(newPassword);

    user.password = hashedPassword;
    await this.userRepository.update(user.id, user);

    await this.userService.removeRefreshToken(user.id);
  }
}
