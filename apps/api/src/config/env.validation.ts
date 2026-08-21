import * as Joi from 'joi';

/**
 * A value that development can live without, but that production must not boot
 * without. Google OAuth and FRONTEND_URL have placeholder fallbacks wired in
 * (see GoogleStrategy) so a developer can run the app without an OAuth app
 * configured — but shipping those placeholders to production would silently
 * break login and produce `undefined/admin` redirects, so they are hard
 * requirements once NODE_ENV is `production`.
 */
const requiredInProduction = Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.string().required(),
  otherwise: Joi.string().allow('').optional(),
});

/**
 * Boot-time environment validation. Without this, missing secrets degrade
 * silently: JWT_SECRET used to fall back to a literal committed in this repo
 * (anyone could forge an admin session), and an unset FRONTEND_URL made CORS
 * reject every browser request instead of failing loudly at startup.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Required everywhere: the app cannot do anything meaningful without them,
  // and a fallback for either one is a security hole rather than a convenience.
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),

  JWT_EXPIRES_IN: Joi.string().default('7d'),
  PORT: Joi.number().default(3000),

  FRONTEND_URL: requiredInProduction,
  GOOGLE_CLIENT_ID: requiredInProduction,
  GOOGLE_CLIENT_SECRET: requiredInProduction,
  GOOGLE_CALLBACK_URL: requiredInProduction,
  ALLOWED_ADMIN_EMAILS: requiredInProduction,
}).unknown(true);
