import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OriginCheckGuard } from './origin-check.guard';

/**
 * CSRF defence by Origin check.
 *
 * The attack this closes (docs/audit/2026-08-22-securite.md): the admin session
 * lives in a cookie that production must send `SameSite=None` because the app
 * and the API sit on different domains. A third-party page can therefore make
 * the organiser's browser fire an authenticated POST/PATCH/DELETE at the API.
 * Browsers attach `Origin` to every one of those requests and a page cannot
 * forge it, so comparing it to the one allowed origin rejects the forgery while
 * letting the real frontend through.
 */
const ALLOWED = 'https://invitation.example.com';

function guardWith(env: Record<string, string | undefined>) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
  return new OriginCheckGuard(config);
}

function contextFor(method: string, origin?: string): ExecutionContext {
  const headers: Record<string, string> = {};
  if (origin !== undefined) headers.origin = origin;
  return {
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as unknown as ExecutionContext;
}

const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

describe('OriginCheckGuard', () => {
  describe('rejects cross-origin state changes', () => {
    it.each(MUTATING)(
      '%s carrying an attacker origin is refused',
      (method) => {
        const guard = guardWith({ FRONTEND_URL: ALLOWED });

        expect(() =>
          guard.canActivate(contextFor(method, 'https://evil.example.net')),
        ).toThrow(ForbiddenException);
      },
    );

    it('refuses an origin that merely starts with the allowed one', () => {
      // The classic prefix-match hole: an attacker registers a domain that
      // begins with the trusted string. `startsWith` would wave this through.
      const guard = guardWith({ FRONTEND_URL: ALLOWED });

      expect(() =>
        guard.canActivate(
          contextFor('POST', 'https://invitation.example.com.evil.net'),
        ),
      ).toThrow(ForbiddenException);
    });

    it('refuses the right host on the wrong scheme', () => {
      // http:// and https:// are different origins. Accepting the plain-http
      // twin would hand a network attacker a way in.
      const guard = guardWith({ FRONTEND_URL: ALLOWED });

      expect(() =>
        guard.canActivate(contextFor('POST', 'http://invitation.example.com')),
      ).toThrow(ForbiddenException);
    });

    it('refuses the right host on a different port', () => {
      const guard = guardWith({ FRONTEND_URL: 'http://localhost:5173' });

      expect(() =>
        guard.canActivate(contextFor('POST', 'http://localhost:4173')),
      ).toThrow(ForbiddenException);
    });
  });

  describe('lets legitimate traffic through', () => {
    it.each(MUTATING)('%s from the configured frontend is allowed', (method) => {
      const guard = guardWith({ FRONTEND_URL: ALLOWED });

      expect(guard.canActivate(contextFor(method, ALLOWED))).toBe(true);
    });

    it.each(MUTATING)(
      '%s with no Origin header at all is allowed',
      (method) => {
        // Deliberate. Browsers always send Origin on a mutating request, so a
        // missing one means a non-browser client: curl, the e2e suite, uptime
        // monitoring. Refusing it breaks tooling without closing any browser
        // vector. Do not "harden" this without measuring what it breaks.
        const guard = guardWith({ FRONTEND_URL: ALLOWED });

        expect(guard.canActivate(contextFor(method))).toBe(true);
      },
    );

    it.each(['GET', 'HEAD', 'OPTIONS'])(
      '%s is allowed whatever the origin, because it changes no state',
      (method) => {
        const guard = guardWith({ FRONTEND_URL: ALLOWED });

        expect(
          guard.canActivate(contextFor(method, 'https://evil.example.net')),
        ).toBe(true);
      },
    );

    it('falls back to the local dev frontend when FRONTEND_URL is unset', () => {
      const guard = guardWith({});

      expect(
        guard.canActivate(contextFor('POST', 'http://localhost:5173')),
      ).toBe(true);
    });

    it('tolerates a trailing slash on FRONTEND_URL', () => {
      // A browser never puts a trailing slash in Origin. If someone configures
      // FRONTEND_URL as "https://host/", a strict compare rejects every single
      // write from the real app — and it looks like a bug in the app, not in
      // the env file.
      const guard = guardWith({ FRONTEND_URL: `${ALLOWED}/` });

      expect(guard.canActivate(contextFor('POST', ALLOWED))).toBe(true);
    });
  });
});
