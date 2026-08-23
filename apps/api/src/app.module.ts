import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { THROTTLE_DEFAULT } from './config/throttle.config';
import { OriginCheckGuard } from './common/guards/origin-check.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { HouseholdsModule } from './households/households.module';
import { InvitationModule } from './invitation/invitation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TablesModule } from './tables/tables.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Fail loudly at boot on a missing/invalid secret rather than degrading
      // into a silently-insecure runtime. `abortEarly: false` so a misconfigured
      // deploy reports every missing variable in one go.
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    // One ambient limit for the whole app; the two endpoints that need
    // something different say so with @Throttle (see config/throttle.config.ts).
    ThrottlerModule.forRoot([THROTTLE_DEFAULT]),
    PrismaModule,
    AuthModule,
    HouseholdsModule,
    InvitationModule,
    DashboardModule,
    TablesModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: reject a forged cross-origin write before it reaches the
    // throttler. The forged request comes from the victim's own browser, so
    // counting it would let an attacker exhaust the victim's rate limit and
    // lock them out of their own dashboard.
    { provide: APP_GUARD, useClass: OriginCheckGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
