export interface Configuration {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGINS: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  REDIS_URL: string;
  S3_BUCKET: string;
  S3_REGION: string;
  S3_KEY_ID: string;
  S3_SECRET: string;
}
