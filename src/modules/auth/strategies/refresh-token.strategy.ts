import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret)
      throw new Error(
        'JWT_REFRESH_SECRET must be defined in environment variables.',
      );

    super({
      secretOrKey: secret as string,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request.cookies['refreshToken'];
        },
      ]),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies['refreshToken'];
    const user = await this.usersService.findOne(payload.sub);

    if (!user || !user.refreshToken)
      throw new UnauthorizedException(
        'Refresh token invalid or user logged out.',
      );

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!tokenMatches) {
      await this.usersService.removeRefreshToken(user.id);
      throw new UnauthorizedException('Refresh token mismatch.');
    }

    return { userId: user.id, userName: user.name, refreshToken };
  }
}
