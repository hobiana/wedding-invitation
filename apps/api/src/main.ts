import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';

async function bootstrap() {
  // AppModule validates the environment (see config/env.validation.ts) while
  // it is being created, so a production deploy missing JWT_SECRET/DATABASE_URL
  // (or FRONTEND_URL, or the Google OAuth variables) throws here instead of
  // booting into a silently-broken state.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  configureApp(app, config);

  await app.listen(config.get<number>('PORT') ?? 3000);
}
bootstrap();
