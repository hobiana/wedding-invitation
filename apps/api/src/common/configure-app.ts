import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { resolveFrontendUrl } from '../config/frontend-url';

/**
 * Everything the HTTP layer needs before it starts listening.
 *
 * Extracted out of main.ts so it can be exercised by a test: bootstrap() binds
 * a port, which makes its configuration effectively unverifiable, and one of
 * these settings (trust proxy) silently breaks rate limiting when it is wrong.
 */
export function configureApp(
  app: NestExpressApplication,
  config: ConfigService,
): void {
  // Production terminates TLS at one proxy hop (Railway/Render) that appends
  // the caller to X-Forwarded-For. Without this, req.ip is the proxy for every
  // caller and the rate limiter counts the entire internet in a single bucket.
  // `1` — not `true` — so only that one hop is believed: trusting the whole
  // chain lets a caller prepend a forged address and rotate past any limit.
  app.set('trust proxy', 1);
  app.use(cookieParser());
  // `origin: undefined` makes CORS reject every browser request without any
  // log line to explain it, so fall back to the local dev frontend. In
  // production FRONTEND_URL is a validated hard requirement.
  app.enableCors({
    origin: resolveFrontendUrl(config),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
