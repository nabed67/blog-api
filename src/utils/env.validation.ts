import * as Joi from 'joi';

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().message('DATABASE_URL is missing'),
  PORT: Joi.number().port().default(3000),
});
