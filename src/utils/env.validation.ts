import * as Joi from 'joi';

const MIN_SECRET_LENGTH = 32;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is required',
    'string.empty': 'DATABASE_URL is required',
  }),
  CORS_ORIGINS: Joi.string()
    .custom((value: string, helpers) => {
      if (value.trim() === '*') return helpers.error('any.invalid');
      return value;
    }, 'CORS origin allowlist')
    .default('http://localhost:3000')
    .messages({
      'any.invalid':
        'CORS_ORIGINS must be a comma-separated allowlist, not a wildcard',
    }),

  JWT_SECRET: Joi.string()
    .min(MIN_SECRET_LENGTH)
    .required()
    .messages({
      'any.required': 'JWT_SECRET is required',
      'string.min': `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    }),
  JWT_REFRESH_SECRET: Joi.string()
    .min(MIN_SECRET_LENGTH)
    .required()
    .messages({
      'any.required': 'JWT_REFRESH_SECRET is required',
      'string.min': `JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    }),

  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required()
    .messages({
      'any.required': 'REDIS_URL is required',
      'string.uri': 'REDIS_URL must be a valid redis:// or rediss:// URI',
    }),

  S3_BUCKET: Joi.string().required().messages({
    'any.required': 'S3_BUCKET is required',
  }),
  S3_REGION: Joi.string().required().messages({
    'any.required': 'S3_REGION is required',
  }),
  S3_KEY_ID: Joi.string().required().messages({
    'any.required': 'S3_KEY_ID is required',
  }),
  S3_SECRET: Joi.string().required().messages({
    'any.required': 'S3_SECRET is required',
  }),
});

export function parseCorsOrigins(origins: string): string[] {
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
