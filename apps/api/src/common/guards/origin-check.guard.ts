import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveFrontendUrl } from '../../config/frontend-url';

/** Methods that change no state, so they are not a CSRF vector. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface OriginCheckRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

/** Origins carry no path, so a trailing slash is noise — and a config footgun. */
function normalise(origin: string): string {
  return origin.replace(/\/+$/, '');
}

/**
 * CSRF defence: refuse a state change whose `Origin` is not the app's own.
 *
 * The admin session is a cookie, and in production it must be `SameSite=None`
 * (frontend and API live on different domains), so the browser attaches it to
 * cross-site requests too. Without this guard, any page the organiser visits
 * can fire an authenticated write at the API. `Origin` is set by the browser
 * and unforgeable by page script, which is what makes the comparison worth
 * anything.
 *
 * Registered globally rather than on /admin/* alone: `POST /auth/logout` and
 * `PATCH /invitation/:linkId/rsvp` are forgeable too, and the frontend already
 * sends a correct `Origin` on every request, so widening the net costs nothing.
 */
@Injectable()
export class OriginCheckGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OriginCheckRequest>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const origin = request.headers.origin;
    // No Origin means no browser: curl, the e2e suite, uptime probes. Browsers
    // always send it on a mutating request, so rejecting here would break
    // tooling without closing a single attack path. See the spec for why this
    // is a decision and not an oversight.
    if (typeof origin !== 'string' || origin.length === 0) return true;

    if (normalise(origin) === normalise(resolveFrontendUrl(this.config))) {
      return true;
    }

    throw new ForbiddenException('Cross-origin request rejected');
  }
}
