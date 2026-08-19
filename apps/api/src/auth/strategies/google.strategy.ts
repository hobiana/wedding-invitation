import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      // passport-oauth2's Strategy constructor throws synchronously if
      // clientID/clientSecret are falsy (including ''), and GoogleStrategy
      // is an eagerly-instantiated Nest provider — so an empty/unset value
      // here would crash the whole AppModule at boot, not just OAuth
      // requests. Fall back to non-empty placeholders so the app (and every
      // other route) still boots fine when Google OAuth isn't configured;
      // the strategy just won't work correctly, which is expected.
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'unconfigured',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'unconfigured',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const user = await this.authService.validateGoogleUser(email, profile.id);
    if (!user)
      return done(new UnauthorizedException('Email not authorized'), false);
    done(null, user);
  }
}
