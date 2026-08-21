import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AdminUser } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

interface CookieOptions {
  httpOnly?: boolean;
  sameSite?: string;
  secure?: boolean;
  path?: string;
  maxAge?: number;
}

interface ResponseMock {
  cookie: jest.Mock<void, [string, string, CookieOptions]>;
  clearCookie: jest.Mock<void, [string, CookieOptions]>;
  redirect: jest.Mock<void, [string]>;
}

const user = { id: 'u1', email: 'admin@example.com' } as AdminUser;

async function createController(env: Record<string, string>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: { login: jest.fn().mockReturnValue({ accessToken: 'jwt' }) },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn((key: string) => env[key]) },
      },
    ],
  }).compile();

  const res: ResponseMock = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  };
  return { controller: moduleRef.get(AuthController), res };
}

describe('AuthController auth cookie attributes', () => {
  it('uses SameSite=None + Secure in production so the cross-site admin fetch sends it', async () => {
    const { controller, res } = await createController({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://invitation.example.com',
    });

    controller.login({ user }, res as unknown as Response);

    const [[name, , options]] = res.cookie.mock.calls;
    expect(name).toBe('access_token');
    expect(options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
      }),
    );
  });

  it('uses SameSite=Lax without Secure in development (same-site over plain http)', async () => {
    const { controller, res } = await createController({
      NODE_ENV: 'development',
    });

    controller.login({ user }, res as unknown as Response);

    const [[, , options]] = res.cookie.mock.calls;
    expect(options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
      }),
    );
  });

  it.each(['production', 'development'])(
    'clears the cookie in %s with the same attributes it was set with, or the browser keeps it',
    async (nodeEnv) => {
      const { controller, res } = await createController({
        NODE_ENV: nodeEnv,
        FRONTEND_URL: 'https://invitation.example.com',
      });

      controller.login({ user }, res as unknown as Response);
      controller.logout(res as unknown as Response);

      const [[, , setOptions]] = res.cookie.mock.calls;
      const [[clearedName, clearOptions]] = res.clearCookie.mock.calls;

      expect(clearedName).toBe('access_token');
      expect(clearOptions.sameSite).toBe(setOptions.sameSite);
      expect(clearOptions.secure).toBe(setOptions.secure);
      expect(clearOptions.path).toBe(setOptions.path);
      expect(clearOptions.httpOnly).toBe(setOptions.httpOnly);
    },
  );
});

describe('AuthController Google callback redirect', () => {
  it('redirects to the configured frontend', async () => {
    const { controller, res } = await createController({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://invitation.example.com',
    });

    controller.googleCallback({ user }, res as unknown as Response);

    expect(res.redirect).toHaveBeenCalledWith(
      'https://invitation.example.com/admin',
    );
  });

  it('falls back to the local frontend instead of redirecting to "undefined/admin"', async () => {
    const { controller, res } = await createController({
      NODE_ENV: 'development',
    });

    controller.googleCallback({ user }, res as unknown as Response);

    const [[target]] = res.redirect.mock.calls;
    expect(target).not.toContain('undefined');
    expect(target).toBe('http://localhost:5173/admin');
  });
});
