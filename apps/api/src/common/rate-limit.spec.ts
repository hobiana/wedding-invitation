import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Server } from 'http';
import request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { GoogleAuthGuard } from '../auth/guards/google-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import {
  THROTTLE_DEFAULT,
  THROTTLE_INVITATION,
  THROTTLE_LOGIN,
} from '../config/throttle.config';
import { InvitationController } from '../invitation/invitation.controller';
import { InvitationService } from '../invitation/invitation.service';

/**
 * Rate limiting, exercised against the real controllers over real HTTP so the
 * decorators themselves are under test — asserting on reflected metadata would
 * pass just as happily if the guard were never wired up.
 *
 * Every request here comes from 127.0.0.1, so each route sees a single bucket.
 * A fresh app per test gives a fresh ThrottlerStorage, keeping the counts from
 * bleeding between cases.
 */

const allowAndAttachUser = {
  canActivate: (context: { switchToHttp: () => { getRequest: () => any } }) => {
    context.switchToHttp().getRequest().user = {
      id: 'admin-1',
      email: 'admin@example.com',
    };
    return true;
  },
};

async function bootTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([THROTTLE_DEFAULT])],
    controllers: [AuthController, InvitationController],
    providers: [
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      {
        provide: AuthService,
        useValue: { login: jest.fn().mockReturnValue({ accessToken: 'jwt' }) },
      },
      {
        provide: InvitationService,
        useValue: {
          getInvitation: jest.fn().mockResolvedValue({ displayName: 'Famille' }),
          submitRsvp: jest.fn().mockResolvedValue({ status: 'CONFIRMED' }),
        },
      },
      { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
    ],
  })
    .overrideGuard(LocalAuthGuard)
    .useValue(allowAndAttachUser)
    .overrideGuard(JwtAuthGuard)
    .useValue(allowAndAttachUser)
    .overrideGuard(GoogleAuthGuard)
    .useValue(allowAndAttachUser)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  const server = app.getHttpServer() as Server;
  // Listen once and reuse. Left unbound, supertest spins up and tears down an
  // ephemeral listener per request, which these hundred-request cases would
  // turn into a port-churn problem.
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  return { app, server };
}

/** Fires `count` requests in small parallel batches; returns every status. */
async function fire(
  count: number,
  send: () => Promise<{ status: number }>,
): Promise<number[]> {
  const statuses: number[] = [];
  const BATCH = 25;
  for (let sent = 0; sent < count; sent += BATCH) {
    const size = Math.min(BATCH, count - sent);
    const batch = Array.from({ length: size }, () =>
      send().then((res) => res.status),
    );
    statuses.push(...(await Promise.all(batch)));
  }
  return statuses;
}

describe('Rate limiting', () => {
  let app: INestApplication;
  let server: Server;

  beforeEach(async () => {
    ({ app, server } = await bootTestApp());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/login is strict', () => {
    const login = () =>
      request(server)
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'whatever' });

    it(`allows ${THROTTLE_LOGIN.limit} attempts then answers 429`, async () => {
      const allowed = await fire(THROTTLE_LOGIN.limit as number, login);
      expect(allowed.every((status) => status !== 429)).toBe(true);

      const blocked = await login();
      expect(blocked.status).toBe(429);
    });

    it('is far stricter than the ambient default limit', async () => {
      // Guards against someone "simplifying" the decorator away and leaving
      // login on the 120/min default, which would not slow a brute force at all.
      expect(THROTTLE_LOGIN.limit).toBeLessThan(
        THROTTLE_DEFAULT.limit as number,
      );
    });
  });

  describe('GET /invitation/:linkId is generous', () => {
    const openInvitation = () => request(server).get('/invitation/abc123');

    it('serves guests well past the point the default limit would cut them off', async () => {
      // The day the 150 links go out, households behind one carrier NAT all
      // share an IP. Being capped at the admin-grade default would read to a
      // guest as "the invitation is broken".
      const statuses = await fire(
        (THROTTLE_DEFAULT.limit as number) + 1,
        openInvitation,
      );

      expect(statuses.filter((status) => status === 429)).toEqual([]);
    });

    it(`still caps enumeration at ${THROTTLE_INVITATION.limit} a minute`, async () => {
      // Generous is not unlimited: the linkId is the guest's only credential.
      await fire(THROTTLE_INVITATION.limit as number, openInvitation);

      const blocked = await openInvitation();
      expect(blocked.status).toBe(429);
    }, 30_000);

    it('does not share a bucket with login', async () => {
      // Per-route keys, so exhausting login must leave guests untouched.
      await fire((THROTTLE_LOGIN.limit as number) + 5, () =>
        request(server).post('/auth/login').send({}),
      );

      const guest = await openInvitation();
      expect(guest.status).toBe(200);
    });
  });
});
