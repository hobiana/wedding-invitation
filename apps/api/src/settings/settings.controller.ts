import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { AdminSettingsDto } from '@invitation-app/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toAdminSettingsDto } from '../common/contract';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/**
 * Comme pour les foyers et les tables, la traduction vers le contrat se fait
 * ici et non dans le service : le service garde des `Date`, le fil reçoit de
 * l'ISO. Le type de retour annoncé n'est pas décoratif — c'est lui qui force
 * le passage par `toAdminSettingsDto`, donc le seul endroit où le compilateur
 * confronte les colonnes nullables au contrat.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async get(): Promise<AdminSettingsDto> {
    return toAdminSettingsDto(await this.settingsService.get());
  }

  @Patch()
  async update(@Body() dto: UpdateSettingsDto): Promise<AdminSettingsDto> {
    return toAdminSettingsDto(await this.settingsService.update(dto));
  }
}
