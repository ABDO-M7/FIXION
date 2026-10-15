import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

type JwtRequest = {
  headers?: { authorization?: string };
  cookies?: { accessToken?: string };
};

export function extractAccessToken(req: JwtRequest): string | null {
  const bearerToken = req.headers?.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return bearerToken || req.cookies?.accessToken || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractAccessToken,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) return null;
    return user;
  }
}
