import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  // AppModule validates the environment (see config/env.validation.ts) while
  // it is being created, so a production deploy missing JWT_SECRET/DATABASE_URL
  // (or FRONTEND_URL, or the Google OAuth variables) throws here instead of
  // booting into a silently-broken state.
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  // `origin: undefined` makes CORS reject every browser request without any
  // log line to explain it, so fall back to the local dev frontend. In
  // production FRONTEND_URL is a validated hard requirement.
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL') || 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(config.get<number>('PORT') ?? 3000);
}
bootstrap();
