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
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  create(@Body() dto: CreateHouseholdDto) {
    return this.householdsService.create(dto);
  }

  @Get()
  findAll() {
    return this.householdsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.householdsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHouseholdDto) {
    return this.householdsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.householdsService.remove(id);
  }
}
