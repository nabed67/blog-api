import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import * as argon2 from 'argon2';

import { Configuration } from 'src/common/interfaces/config.interface';
import { DbService } from 'src/db/db.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './interfaces/user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_TTL_MS } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Configuration, true>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`A user with this ${field} already exists`);
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user: User = await this.db.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        displayName: dto.displayName,
      },
      omit: { password: true },
    });

    return user;
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        password: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.password, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = this.issueTokens(payload);
    await this.storeRefreshToken(user.id, refreshToken);
    this.setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async refresh(user: JwtPayload, res: Response) {
    const payload: JwtPayload = {
      sub: user.sub,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = this.issueTokens(payload);
    await this.storeRefreshToken(user.sub, refreshToken);
    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  async logout(userId: number, res: Response) {
    await this.db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    res.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private issueTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', { infer: true }),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: number,
    rawToken: string,
  ): Promise<void> {
    const hashed = await argon2.hash(rawToken);

    await this.db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashed },
    });
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, token, this.cookieOptions());
  }

  private cookieOptions() {
    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    };
  }
}
