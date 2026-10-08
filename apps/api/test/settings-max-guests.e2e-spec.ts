import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { AdminSettingsDto } from '@invitation-app/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Le seuil d'invités à travers la vraie pile : `ValidationPipe` global
 * (`whitelist`, refus de 0), garde JWT, service, convertisseur de contrat,
 * colonne nullable.
 *
 * La ligne `singleton` est partagée avec la base de développement : sa valeur
 * est relevée avant et remise après, pour ne rien laisser derrière.
 */
describe('PATCH /admin/settings — maxGuests (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cookie: string;
  let original: number | null;
  const email = 'e2e-max-guests@example.com';
  const password = 'super-secret';

  function patch(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch('/admin/settings')
      .set('Cookie', cookie)
      .send(body);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, app.get(ConfigService));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    original = (
      await prisma.weddingSettings.findUniqueOrThrow({
        where: { id: 'singleton' },
      })
    ).maxGuests;

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
    await prisma.weddingSettings.update({
      where: { id: 'singleton' },
      data: { maxGuests: original },
    });
    await prisma.adminUser.deleteMany({ where: { email } });
    await app.close();
  });

  it('stores a threshold and returns it on the organiser contract', async () => {
    const res = await patch({ maxGuests: 120 }).expect(200);

    expect((res.body as AdminSettingsDto).maxGuests).toBe(120);
    const get = await request(app.getHttpServer())
      .get('/admin/settings')
      .set('Cookie', cookie)
      .expect(200);
    expect((get.body as AdminSettingsDto).maxGuests).toBe(120);
  });

  it('leaves the threshold untouched when a PATCH does not mention it', async () => {
    await patch({ maxGuests: 150 }).expect(200);

    const res = await patch({ seatingPlanActivated: false }).expect(200);

    expect((res.body as AdminSettingsDto).maxGuests).toBe(150);
  });

  it('clears the threshold on an explicit null', async () => {
    await patch({ maxGuests: 150 }).expect(200);

    const res = await patch({ maxGuests: null }).expect(200);

    expect(res.body).toHaveProperty('maxGuests', null);
    const row = await prisma.weddingSettings.findUniqueOrThrow({
      where: { id: 'singleton' },
    });
    expect(row.maxGuests).toBeNull();
  });

  it.each([0, 1.5, 10001])(
    'refuses %p with a 400 and leaves the stored value as it was',
    async (value) => {
      await patch({ maxGuests: 90 }).expect(200);

      await patch({ maxGuests: value }).expect(400);

      const row = await prisma.weddingSettings.findUniqueOrThrow({
        where: { id: 'singleton' },
      });
      expect(row.maxGuests).toBe(90);
    },
  );

  it('keeps the threshold off the public invitation contract', async () => {
    const household = await prisma.household.create({
      data: {
        id: 'e2emaxg1',
        displayName: 'Famille e2e seuil',
        allocatedSeats: 2,
        memberNames: [],
      },
    });
    try {
      const res = await request(app.getHttpServer())
        .get(`/invitation/${household.id}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('maxGuests');
    } finally {
      await prisma.household.delete({ where: { id: household.id } });
    }
  });
});
