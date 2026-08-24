import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import type { Configuration } from './common/interfaces/config.interface';
import { validationSchema } from './utils/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>) => ({
        throttlers: [{ name: 'global', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(
          config.get('REDIS_URL', { infer: true }),
        ),
      }),
    }),
    DbModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    /**
     * Rate-limiting guard — first line of defence before auth/roles checks.
     * Default: 100 req / 60 s per IP (Redis-backed).
     * Override per-controller/route with @Throttle({ global: { limit, ttl } }).
     */
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    /**
     * Global guard - every route is protected by default.
     * Use @Public() to opt out.
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    /**
     * Global roles guard - honours @Roles() on any route.
     */
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
