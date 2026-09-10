import { Controller, Get, UseGuards } from '@nestjs/common';
import type { DashboardStatsDto } from '@invitation-app/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats();
  }
}
