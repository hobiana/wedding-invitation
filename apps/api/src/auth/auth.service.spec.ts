import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    adminUser: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        JwtService,
        { provide: ConfigService, useValue: { get: () => '' } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('returns null when the email is unknown', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    const result = await service.validateUser('nobody@example.com', 'pw');
    expect(result).toBeNull();
  });

  it('returns null when the password does not match', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prisma.adminUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      passwordHash,
    });
    const result = await service.validateUser('a@b.com', 'wrong-password');
    expect(result).toBeNull();
  });

  it('returns the user when the password matches', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const user = { id: '1', email: 'a@b.com', passwordHash };
    prisma.adminUser.findUnique.mockResolvedValue(user);
    const result = await service.validateUser('a@b.com', 'correct-password');
    expect(result).toEqual(user);
  });
});
