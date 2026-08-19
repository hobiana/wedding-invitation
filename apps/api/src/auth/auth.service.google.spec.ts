import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService.validateGoogleUser', () => {
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
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'ALLOWED_ADMIN_EMAILS' ? 'allowed@example.com' : '',
          },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('rejects an email not on the whitelist', async () => {
    const result = await service.validateGoogleUser(
      'stranger@example.com',
      'google-1',
    );
    expect(result).toBeNull();
    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it('creates the admin user on first login for a whitelisted email', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);
    prisma.adminUser.create.mockResolvedValue({
      id: '1',
      email: 'allowed@example.com',
      googleId: 'google-1',
    });
    const result = await service.validateGoogleUser(
      'allowed@example.com',
      'google-1',
    );
    expect(result?.email).toBe('allowed@example.com');
    expect(prisma.adminUser.create).toHaveBeenCalledWith({
      data: { email: 'allowed@example.com', googleId: 'google-1' },
    });
  });
});
