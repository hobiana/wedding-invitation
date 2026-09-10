import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { HouseholdAdminDto } from '@invitation-app/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toHouseholdAdminDto } from '../common/contract';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';

/**
 * La traduction vers le contrat se fait ici et pas dans le service : les
 * lectures du service sont aussi des lectures **internes** — `findOne`
 * alimente le contrôle de capacité de `update`. Un service qui renverrait le
 * DTO ferait entrer dans la logique métier des dates devenues des chaînes.
 * Le domaine garde ses `Date`, le fil reçoit de l'ISO.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  async create(@Body() dto: CreateHouseholdDto): Promise<HouseholdAdminDto> {
    return toHouseholdAdminDto(await this.householdsService.create(dto));
  }

  @Get()
  async findAll(): Promise<HouseholdAdminDto[]> {
    const households = await this.householdsService.findAll();
    return households.map(toHouseholdAdminDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<HouseholdAdminDto> {
    return toHouseholdAdminDto(await this.householdsService.findOne(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdDto,
  ): Promise<HouseholdAdminDto> {
    return toHouseholdAdminDto(await this.householdsService.update(id, dto));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.householdsService.remove(id);
  }
}
