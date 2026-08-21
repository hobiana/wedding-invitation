import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

function cookieExtractor(req: Request): string | null {
  const cookies = req?.cookies as Record<string, string> | undefined;
  return cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      // No `?? 'dev-secret'` fallback: verifying tokens against a secret that
      // is published in this repo would accept forged admin sessions.
      // envValidationSchema makes JWT_SECRET required at boot.
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
