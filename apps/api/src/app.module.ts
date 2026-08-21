import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { HouseholdsModule } from './households/households.module';
import { InvitationModule } from './invitation/invitation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HouseholdsModule,
    InvitationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
