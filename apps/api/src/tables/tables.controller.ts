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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.create(dto);
  }

  @Get()
  findAll() {
    return this.tablesService.findAll();
  }

  @Patch('unassign/:householdId')
  unassign(@Param('householdId') householdId: string) {
    return this.tablesService.unassignHousehold(householdId);
  }

  @Patch(':tableId/assign/:householdId')
  assign(
    @Param('tableId') tableId: string,
    @Param('householdId') householdId: string,
  ) {
    return this.tablesService.assignHousehold(tableId, householdId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tablesService.remove(id);
  }
}
