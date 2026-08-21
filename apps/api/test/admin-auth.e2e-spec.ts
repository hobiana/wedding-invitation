import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Every admin controller carries `@UseGuards(JwtAuthGuard)`, but nothing
 * asserted it — a dropped decorator on any one of them would expose the whole
 * guest list, and the RSVP/seating write endpoints, to the open internet with
 * no test failing. This locks the guard down at the routing level.
 */
describe('Admin routes reject unauthenticated callers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const readRoutes = [
    '/admin/households',
    '/admin/dashboard',
    '/admin/tables',
    '/admin/settings',
  ];

  it.each(readRoutes)('GET %s without a cookie returns 401', async (route) => {
    await request(app.getHttpServer()).get(route).expect(401);
  });

  const writeRoutes: [string, string][] = [
    ['post', '/admin/households'],
    ['patch', '/admin/households/any-id'],
    ['delete', '/admin/households/any-id'],
    ['post', '/admin/tables'],
    ['patch', '/admin/tables/any-id'],
    ['delete', '/admin/tables/any-id'],
    ['patch', '/admin/tables/any-id/assign/any-household'],
    ['patch', '/admin/tables/unassign/any-household'],
    ['patch', '/admin/settings'],
  ];

  it.each(writeRoutes)(
    '%s %s without a cookie returns 401',
    async (method, route) => {
      await request(app.getHttpServer())
        [method as 'post' | 'patch' | 'delete'](route)
        .send({})
        .expect(401);
    },
  );

  it('rejects a request carrying a token signed with a different secret', async () => {
    await request(app.getHttpServer())
      .get('/admin/households')
      .set('Cookie', 'access_token=not-a-valid-jwt')
      .expect(401);
  });
});
