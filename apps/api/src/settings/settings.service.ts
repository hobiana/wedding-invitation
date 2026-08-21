import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.weddingSettings.findUniqueOrThrow({
      where: { id: 'singleton' },
    });
  }

  update(dto: UpdateSettingsDto) {
    const { weddingDate, rsvpDeadline, ...rest } = dto;
    const data = {
      ...rest,
      ...(weddingDate !== undefined && { weddingDate: new Date(weddingDate) }),
      ...(rsvpDeadline !== undefined && {
        rsvpDeadline: new Date(rsvpDeadline),
      }),
    };
    return this.prisma.weddingSettings.update({
      where: { id: 'singleton' },
      data,
    });
  }
}
