import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Configuration } from './common/interfaces/config.interface';
import { parseCorsOrigins } from './utils/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<Configuration, true>);

  const logger = new Logger('Bootstrap');

  const isProduction =
    configService.get('NODE_ENV', { infer: true }) === 'production';

  const port = configService.get('PORT', { infer: true });

  const corsOrigins = parseCorsOrigins(
    configService.get('CORS_ORIGINS', { infer: true }),
  );

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  app.use(compression());
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
              scriptSrc: ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('Production-grade blog platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Blog API Docs',
  });

  await app.listen(port);

  logger.log(`Application running on http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Failed to bootstrap application',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
