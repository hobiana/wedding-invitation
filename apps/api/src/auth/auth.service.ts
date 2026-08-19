import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<AdminUser | null> {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
  }

  async validateGoogleUser(
    email: string | undefined,
    googleId: string,
  ): Promise<AdminUser | null> {
    if (!email) return null;
    const allowed = (this.config.get<string>('ALLOWED_ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(email.toLowerCase())) return null;

    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (!existing) {
      return this.prisma.adminUser.create({ data: { email, googleId } });
    }
    if (existing.googleId !== googleId) {
      return this.prisma.adminUser.update({
        where: { id: existing.id },
        data: { googleId },
      });
    }
    return existing;
  }

  login(user: AdminUser): { accessToken: string } {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
