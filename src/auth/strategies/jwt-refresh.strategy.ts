import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as argon2 from 'argon2';
import type { Request } from 'express';

import { DbService } from 'src/db/db.service';
import { Configuration } from 'src/common/interfaces/config.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService<Configuration, true>,
    private readonly db: DbService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req?.cookies as Record<string, string>)?.refreshToken ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET', { infer: true }),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<JwtRefreshPayload> {
    const rawToken = (req.cookies as Record<string, string>)?.refreshToken;
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        deletedAt: true,
        hashedRefreshToken: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }

    if (!user.hashedRefreshToken) {
      throw new UnauthorizedException(
        'No active session — please log in again',
      );
    }

    const isValid = await argon2.verify(user.hashedRefreshToken, rawToken);
    if (!isValid) {
      await this.db.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      });

      throw new UnauthorizedException(
        'Refresh token is invalid — please log in again',
      );
    }

    return { ...payload, refreshToken: rawToken };
  }
}
