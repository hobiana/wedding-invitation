import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { HouseholdsModule } from './households/households.module';
import { InvitationModule } from './invitation/invitation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TablesModule } from './tables/tables.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HouseholdsModule,
    InvitationModule,
    DashboardModule,
    TablesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
