import { envValidationSchema } from './env.validation';

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@host:5432/db',
  JWT_SECRET: 'a-real-secret',
  FRONTEND_URL: 'https://invitation.example.com',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_CALLBACK_URL: 'https://api.example.com/auth/google/callback',
  ALLOWED_ADMIN_EMAILS: 'admin@example.com',
};

function validate(env: Record<string, unknown>) {
  return envValidationSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
  });
}

describe('envValidationSchema', () => {
  it('accepts a fully configured production environment', () => {
    expect(validate(productionEnv).error).toBeUndefined();
  });

  it('rejects a missing JWT_SECRET rather than falling back to a committed default', () => {
    const { JWT_SECRET: _omitted, ...env } = productionEnv;
    expect(validate(env).error?.message).toContain('JWT_SECRET');
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _omitted, ...env } = productionEnv;
    expect(validate(env).error?.message).toContain('DATABASE_URL');
  });

  it('rejects a missing JWT_SECRET in development too', () => {
    expect(validate({ NODE_ENV: 'development', DATABASE_URL: 'x' }).error
      ?.message).toContain('JWT_SECRET');
  });

  it.each([
    'FRONTEND_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'ALLOWED_ADMIN_EMAILS',
  ])('requires %s in production', (key) => {
    const env = { ...productionEnv };
    delete (env as Record<string, unknown>)[key];
    expect(validate(env).error?.message).toContain(key);
  });

  it.each([
    'FRONTEND_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'ALLOWED_ADMIN_EMAILS',
  ])(
    'leaves %s optional in development, preserving the placeholder fallbacks',
    (key) => {
      const env: Record<string, unknown> = {
        NODE_ENV: 'development',
        DATABASE_URL: productionEnv.DATABASE_URL,
        JWT_SECRET: productionEnv.JWT_SECRET,
      };
      expect(validate(env).error).toBeUndefined();
      // an explicitly-empty value (as shipped in .env.example) is fine too
      env[key] = '';
      expect(validate(env).error).toBeUndefined();
    },
  );

  it('defaults JWT_EXPIRES_IN and PORT when unset', () => {
    const { value } = validate({
      NODE_ENV: 'development',
      DATABASE_URL: productionEnv.DATABASE_URL,
      JWT_SECRET: productionEnv.JWT_SECRET,
    }) as { value: { JWT_EXPIRES_IN: string; PORT: number } };
    expect(value.JWT_EXPIRES_IN).toBe('7d');
    expect(value.PORT).toBe(3000);
  });

  it('passes unknown variables through untouched', () => {
    expect(
      validate({ ...productionEnv, ADMIN_SEED_EMAIL: 'seed@example.com' }).error,
    ).toBeUndefined();
  });
});
