import { ThrottlerOptions } from '@nestjs/throttler';

const ONE_MINUTE = 60_000;

/**
 * Rate limits, in one place so the module, the decorators and the tests all
 * quote the same numbers instead of scattering magic values.
 *
 * @nestjs/throttler keys each counter on
 * `sha256("<Controller>-<handler>-<throttler>-<ip>")`, so every limit below is
 * **per route and per IP** — /auth/login never shares a bucket with
 * /invitation/:linkId. The IP comes from `req.ip`, which is only meaningful
 * because configureApp() sets `trust proxy`.
 */

/** Everything not named below: the JWT-protected admin surface. */
export const THROTTLE_DEFAULT: ThrottlerOptions = {
  ttl: ONE_MINUTE,
  limit: 120,
};

/**
 * Strict, because this is the one endpoint where guessing is the whole attack.
 * The admin password is the only thing standing between the internet and the
 * full guest list; 5 tries a minute makes an online brute force pointless while
 * leaving a human room to fat-finger their password a few times.
 */
export const THROTTLE_LOGIN: ThrottlerOptions = {
  ttl: ONE_MINUTE,
  limit: 5,
};

/**
 * Generous, because the failure mode here is refusing real guests.
 *
 * This is the only public endpoint, and guests arrive in bursts the day the
 * links go out — several households share one address behind a home router or
 * a mobile carrier NAT, and they refresh. A limit tuned for an attacker would
 * lock out a family. It still caps linkId enumeration, which is what matters:
 * the ids are nanoid(8) over a 64-character alphabet — 48 bits, measured — so
 * 300 guesses a minute leaves an attacker some 120 million years per link.
 */
export const THROTTLE_INVITATION: ThrottlerOptions = {
  ttl: ONE_MINUTE,
  limit: 300,
};
