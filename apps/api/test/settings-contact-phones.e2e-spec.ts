import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type {
  AdminSettingsDto,
  InvitationResponseDto,
} from '@invitation-app/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Les numéros des mariés à travers la vraie pile : `ValidationPipe` global
 * (normalisation par `@Transform`, refus de `null` et de `[]`), garde JWT,
 * service, convertisseur de contrat, colonne `TEXT[]` — et la route publique,
 * puisque ces numéros sont faits pour la page invité.
 *
 * La ligne `singleton` est partagée avec la base de développement : sa valeur
 * est relevée avant et remise après, pour ne rien laisser derrière.
 */
describe('PATCH /admin/settings — contactPhones (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cookie: string;
  let original: string[];
  const email = 'e2e-contact-phones@example.com';
  const password = 'super-secret';

  function patch(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch('/admin/settings')
      .set('Cookie', cookie)
      .send(body);
  }

  async function storedPhones() {
    return (
      await prisma.weddingSettings.findUniqueOrThrow({
        where: { id: 'singleton' },
      })
    ).contactPhones;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, app.get(ConfigService));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    original = await storedPhones();

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
      data: { contactPhones: original },
    });
    await prisma.adminUser.deleteMany({ where: { email } });
    await app.close();
  });

  it('stores the numbers normalised and returns them on a fresh GET', async () => {
    const res = await patch({
      contactPhones: ['  +261  34 64 314 02 ', '034 29 682 30'],
    }).expect(200);

    expect((res.body as AdminSettingsDto).contactPhones).toEqual([
      '+261 34 64 314 02',
      '034 29 682 30',
    ]);
    const get = await request(app.getHttpServer())
      .get('/admin/settings')
      .set('Cookie', cookie)
      .expect(200);
    expect((get.body as AdminSettingsDto).contactPhones).toEqual([
      '+261 34 64 314 02',
      '034 29 682 30',
    ]);
  });

  it('leaves the numbers untouched when a PATCH does not mention them', async () => {
    await patch({ contactPhones: ['+261 34 64 314 02'] }).expect(200);

    const res = await patch({ seatingPlanActivated: false }).expect(200);

    expect((res.body as AdminSettingsDto).contactPhones).toEqual([
      '+261 34 64 314 02',
    ]);
  });

  it.each([
    ['null', null],
    ['an empty list', []],
    ['letters', ['abc']],
    ['a script URL', ['javascript:alert(1)']],
    ['markup', ['<script>']],
    ['a country code alone', ['+261']],
    ['a duplicate', ['+261 34 64 314 02', '+261  34 64 314 02']],
    [
      'six numbers',
      Array.from({ length: 6 }, (_, i) => `+261 34 00 000 0${i}`),
    ],
  ])(
    'refuses %s with a 400 and leaves the stored numbers as they were',
    async (_label, value) => {
      await patch({ contactPhones: ['+261 34 29 682 30'] }).expect(200);

      await patch({ contactPhones: value }).expect(400);

      expect(await storedPhones()).toEqual(['+261 34 29 682 30']);
    },
  );

  it('hands the numbers to the public invitation page', async () => {
    await patch({
      contactPhones: ['+261 34 64 314 02', '+261 34 29 682 30'],
    }).expect(200);
    const household = await prisma.household.create({
      data: {
        id: 'e2ephon1',
        displayName: 'Famille e2e téléphones',
        allocatedSeats: 2,
        memberNames: [],
      },
    });
    try {
      const res = await request(app.getHttpServer())
        .get(`/invitation/${household.id}`)
        .expect(200);
      expect((res.body as InvitationResponseDto).wedding.contactPhones).toEqual(
        ['+261 34 64 314 02', '+261 34 29 682 30'],
      );
    } finally {
      await prisma.household.delete({ where: { id: household.id } });
    }
  });
});
