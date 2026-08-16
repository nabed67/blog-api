import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';
import { Configuration } from 'src/common/interfaces/config.interface';

@Injectable()
export class DbService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService<Configuration>) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database connected successfully');
  }
}
