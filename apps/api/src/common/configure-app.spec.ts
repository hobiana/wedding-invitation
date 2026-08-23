import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { configureApp } from './configure-app';

/**
 * A stand-in for any real route. It reports the IP the framework attributes to
 * the caller, which is the value @nestjs/throttler counts requests against
 * (ThrottlerGuard.getTracker returns req.ip).
 */
@Controller('__client-ip')
class ClientIpController {
  @Get()
  clientIp(@Req() req: Request) {
    return { ip: req.ip };
  }
}

describe('configureApp', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientIpController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('attributes the forwarded client IP, not the proxy, behind one proxy hop', async () => {
    // In production the API sits behind Railway/Render. Without trust proxy,
    // req.ip is the proxy's address for EVERY caller, so the throttler files
    // the whole internet under one counter: the generous per-guest limit on
    // /invitation/:linkId then becomes a shared budget, and the day the 150
    // links go out the app rate-limits its own guests. Rate limiting without
    // this setting is at best useless and at worst an outage.
    const res = await request(app.getHttpServer())
      .get('/__client-ip')
      .set('X-Forwarded-For', '203.0.113.7')
      .expect(200);

    expect((res.body as { ip: string }).ip).toBe('203.0.113.7');
  });

  it('ignores an X-Forwarded-For entry the caller prepended themselves', async () => {
    // Trusting the whole chain would make rate limiting decorative: a caller
    // sets their own X-Forwarded-For, gets a brand-new bucket, and repeats.
    // Trusting exactly one hop means only the address the real proxy appended
    // (the rightmost) counts, and anything forged to the left of it is noise.
    const res = await request(app.getHttpServer())
      .get('/__client-ip')
      .set('X-Forwarded-For', '1.2.3.4, 203.0.113.7')
      .expect(200);

    expect((res.body as { ip: string }).ip).toBe('203.0.113.7');
  });

  it('keeps two callers behind the same proxy in separate buckets', async () => {
    const first = await request(app.getHttpServer())
      .get('/__client-ip')
      .set('X-Forwarded-For', '203.0.113.7')
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/__client-ip')
      .set('X-Forwarded-For', '198.51.100.4')
      .expect(200);

    expect((first.body as { ip: string }).ip).not.toBe(
      (second.body as { ip: string }).ip,
    );
  });
});
