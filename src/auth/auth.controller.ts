import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtRefreshGuard } from 'src/common/guards/jwt-refresh.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
@Throttle({ global: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and receive an access token' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Rotate refresh token and obtain a new access token',
  })
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(user, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out — invalidates the refresh token' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub, res);
  }
}
