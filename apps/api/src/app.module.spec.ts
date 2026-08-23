import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OriginCheckGuard } from './common/guards/origin-check.guard';

// ConfigModule.forRoot() validates the environment while the @Module decorator
// is being evaluated, so app.module.ts throws on *import* — not on instantiation
// — when DATABASE_URL/JWT_SECRET are unset. The unit suite has no .env (only the
// e2e suite, which needs a real Postgres, ever imported this module before), so
// supply the two values it demands and require the module afterwards. A static
// import would be hoisted above these assignments and defeat the point.
process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused';
process.env.JWT_SECRET ??= 'unit-test-secret';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppModule } = require('./app.module') as typeof import('./app.module');

/**
 * Both defences added in this batch are global guards, and a global guard that
 * nobody registered is indistinguishable from no guard at all — every one of
 * its own unit tests still passes. This checks the registration itself.
 *
 * Structural on purpose: instantiating AppModule pulls in env validation and
 * Prisma, so it would need a database to answer a question about wiring. What
 * these guards *do* is covered behaviourally in common/rate-limit.spec.ts and
 * common/guards/origin-check.guard.spec.ts.
 */
interface ProviderEntry {
  provide?: unknown;
  useClass?: unknown;
}

function globalGuardsOf(module: object): unknown[] {
  const providers =
    (Reflect.getMetadata('providers', module) as ProviderEntry[]) ?? [];
  return providers
    .filter((provider) => provider?.provide === APP_GUARD)
    .map((provider) => provider.useClass);
}

describe('AppModule global guards', () => {
  it('registers the throttler, so rate limits apply to every route', () => {
    expect(globalGuardsOf(AppModule)).toContain(ThrottlerGuard);
  });

  it('registers the origin check, so CSRF cover is not opt-in per controller', () => {
    expect(globalGuardsOf(AppModule)).toContain(OriginCheckGuard);
  });
});
