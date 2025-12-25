import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret)
      throw new Error(
        'JWT_ACCESS_SECRET must be defined in environment variables.',
      );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret as string,
    });
  }

  async validate(payload: any) {
    // payload: { sub: userId, username: username, iat: ..., exp: ... }
    return {
      userId: payload.sub,
      userName: payload.username,
      role: payload.role,
    };
  }
}
