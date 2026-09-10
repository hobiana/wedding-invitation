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
import type { HouseholdAdminDto, TableDto } from '@invitation-app/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toHouseholdAdminDto, toTableDto } from '../common/contract';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  async create(@Body() dto: CreateTableDto): Promise<TableDto> {
    return toTableDto(await this.tablesService.create(dto));
  }

  @Get()
  async findAll(): Promise<TableDto[]> {
    const tables = await this.tablesService.findAll();
    return tables.map(toTableDto);
  }

  // Assigner et retirer déplacent un **foyer** : ces deux routes répondent un
  // foyer, pas une table. Le contrat le dit maintenant à la compilation.
  @Patch('unassign/:householdId')
  async unassign(
    @Param('householdId') householdId: string,
  ): Promise<HouseholdAdminDto> {
    return toHouseholdAdminDto(
      await this.tablesService.unassignHousehold(householdId),
    );
  }

  @Patch(':tableId/assign/:householdId')
  async assign(
    @Param('tableId') tableId: string,
    @Param('householdId') householdId: string,
  ): Promise<HouseholdAdminDto> {
    return toHouseholdAdminDto(
      await this.tablesService.assignHousehold(tableId, householdId),
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ): Promise<TableDto> {
    return toTableDto(await this.tablesService.update(id, dto));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}
