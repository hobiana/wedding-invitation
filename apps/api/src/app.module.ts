import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
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
    PrismaModule,
    AuthModule,
    HouseholdsModule,
    InvitationModule,
    DashboardModule,
    TablesModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
