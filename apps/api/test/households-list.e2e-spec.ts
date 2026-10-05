import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { HouseholdAdminDto, Page } from '@invitation-app/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * `GET /admin/households` à travers la vraie pile : `ValidationPipe` global
 * (c'est lui qui convertit `?limit=25` en nombre et refuse `?limit=0`),
 * garde JWT, service, convertisseur de contrat.
 *
 * La base de développement contient déjà les foyers de démo. Les foyers de ce
 * test portent tous le marqueur `zqxpagin` dans leur nom, et chaque requête le
 * cherche : c'est ce qui isole le test des données existantes.
 */
describe('GET /admin/households — pagination, search, sort (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cookie: string;
  const email = 'e2e-pagination@example.com';
  const password = 'super-secret';
  const marker = 'zqxpagin';

  const fixtures = [
    {
      id: 'e2epag01',
      displayName: `Famille Zébu ${marker}`,
      allocatedSeats: 4,
      status: 'PENDING' as const,
      confirmedCount: null,
      memberNames: [],
    },
    {
      id: 'e2epag02',
      displayName: `Élodie ${marker}`,
      allocatedSeats: 2,
      status: 'CONFIRMED' as const,
      confirmedCount: 2,
      memberNames: [],
    },
    {
      id: 'e2epag03',
      displayName: `Famille Andria ${marker}`,
      allocatedSeats: 3,
      status: 'DECLINED' as const,
      confirmedCount: 0,
      memberNames: [],
    },
    {
      id: 'e2epag04',
      displayName: `Jean ${marker}`,
      allocatedSeats: 5,
      status: 'CONFIRMED' as const,
      confirmedCount: 3,
      memberNames: ['Zqxmembre'],
    },
    {
      id: 'e2epag05',
      displayName: `Bema ${marker}`,
      allocatedSeats: 1,
      status: 'PENDING' as const,
      confirmedCount: null,
      memberNames: [],
    },
  ];

  function list(qs: Record<string, string>) {
    return request(app.getHttpServer())
      .get('/admin/households')
      .query(qs)
      .set('Cookie', cookie);
  }

  const names = (body: Page<HouseholdAdminDto>) =>
    body.items.map((h) => h.displayName.replace(` ${marker}`, ''));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, app.get(ConfigService));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await prisma.household.deleteMany({
      where: { id: { startsWith: 'e2epag' } },
    });
    await prisma.household.createMany({ data: fixtures });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    cookie = (login.headers['set-cookie'] as unknown as string[])[0];
  });

  afterAll(async () => {
    await prisma.household.deleteMany({
      where: { id: { startsWith: 'e2epag' } },
    });
    await prisma.adminUser.deleteMany({ where: { email } });
    await app.close();
  });

  it('answers with the page envelope and the defaults when nothing is asked', async () => {
    const res = await list({}).expect(200);
    const body = res.body as Page<HouseholdAdminDto>;

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.limit).toBe(100);
    expect(body.offset).toBe(0);
    expect(body.total).toBeGreaterThanOrEqual(fixtures.length);
  });

  it('pages through the search results by name, without overlap', async () => {
    const pages = await Promise.all(
      ['0', '2', '4'].map((offset) =>
        list({ q: marker, sort: 'name', limit: '2', offset }).expect(200),
      ),
    );
    const bodies = pages.map((res) => res.body as Page<HouseholdAdminDto>);

    expect(bodies.map(names)).toEqual([
      ['Famille Andria', 'Bema'],
      ['Élodie', 'Jean'],
      ['Famille Zébu'],
    ]);
    expect(bodies.map((b) => b.total)).toEqual([5, 5, 5]);
    expect(bodies[1]).toMatchObject({ limit: 2, offset: 2 });
  });

  it('sorts by status, most to follow up first', async () => {
    const res = await list({ q: marker, sort: 'status' }).expect(200);

    expect(
      (res.body as Page<HouseholdAdminDto>).items.map((h) => h.status),
    ).toEqual(['PENDING', 'PENDING', 'CONFIRMED', 'CONFIRMED', 'DECLINED']);
  });

  it('sorts by seats in descending order', async () => {
    const res = await list({ q: marker, sort: 'seats', order: 'desc' }).expect(
      200,
    );

    expect(
      (res.body as Page<HouseholdAdminDto>).items.map((h) => h.allocatedSeats),
    ).toEqual([5, 4, 3, 2, 1]);
  });

  // L'invariant qui a cassé trois fois, vérifié sur le fil : null, pas 0.
  it('filters by status and keeps pending households at a null confirmedCount', async () => {
    const res = await list({ q: marker, status: 'PENDING' }).expect(200);
    const body = res.body as Page<HouseholdAdminDto>;

    expect(body.total).toBe(2);
    expect(body.items.map((h) => h.confirmedCount)).toEqual([null, null]);
  });

  it('searches without accents and across member names', async () => {
    const byName = await list({ q: 'ZEBU zqx' }).expect(200);
    const byMember = await list({ q: 'zqxmembre' }).expect(200);

    expect(names(byName.body as Page<HouseholdAdminDto>)).toEqual([
      'Famille Zébu',
    ]);
    expect(names(byMember.body as Page<HouseholdAdminDto>)).toEqual(['Jean']);
  });

  it.each([
    { limit: '0' },
    { limit: '501' },
    { offset: '-1' },
    { sort: 'displayName' },
    { order: 'sideways' },
    { status: 'MAYBE' },
  ])('refuses %o with 400', async (qs) => {
    await list(qs).expect(400);
  });
});
