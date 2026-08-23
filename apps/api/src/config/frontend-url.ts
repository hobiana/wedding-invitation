import { ConfigService } from '@nestjs/config';

/**
 * Where the browser app lives when nothing is configured. Production makes
 * FRONTEND_URL a hard requirement (see config/env.validation.ts), so this only
 * ever applies to local development.
 */
export const FRONTEND_URL_FALLBACK = 'http://localhost:5173';

/**
 * The one allowed browser origin.
 *
 * Three places need this exact value: the CORS allow-list, the Google callback
 * redirect, and the CSRF origin check. They used to hold their own copy of the
 * literal. Two copies that drift produce the worst kind of bug — a guard that
 * admits what CORS refuses, or refuses what CORS admits — and neither failure
 * looks like a configuration mistake from the outside. Hence one function.
 */
export function resolveFrontendUrl(config: ConfigService): string {
  return config.get<string>('FRONTEND_URL') || FRONTEND_URL_FALLBACK;
}
