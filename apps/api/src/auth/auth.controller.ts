import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { CurrentAdminDto } from '@invitation-app/shared';
import { resolveFrontendUrl } from '../config/frontend-url';
import { THROTTLE_LOGIN } from '../config/throttle.config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AdminUser } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Attributes shared by the set and the clear of the auth cookie. Browsers
   * only drop a cookie when clearCookie repeats the attributes it was set
   * with, so these MUST stay in one place — a mismatch makes logout silently
   * leave the session cookie in place.
   *
   * In production the frontend (Vercel) and the API (Railway/Render) sit on
   * different domains, making every admin fetch cross-site. `SameSite=Lax`
   * cookies are never sent on cross-site requests, so the cookie has to be
   * `SameSite=None`, which browsers reject unless `Secure` is also set — the
   * two always move together. Locally both apps are same-site over plain
   * http, where `Lax` + non-secure is what actually works.
   */
  private authCookieOptions() {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      secure: isProduction,
      path: '/',
    };
  }

  private setAuthCookie(res: Response, accessToken: string) {
    res.cookie('access_token', accessToken, {
      ...this.authCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private frontendUrl() {
    return resolveFrontendUrl(this.config);
  }

  /**
   * Strict: this password is the only thing between the internet and the whole
   * guest list, and an unauthenticated caller can retry as fast as the network
   * allows. Everything else on this controller keeps the ambient default.
   */
  @Throttle({ default: THROTTLE_LOGIN })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Req() req: { user: AdminUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = this.authService.login(req.user);
    this.setAuthCookie(res, accessToken);
    return { email: req.user.email };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', this.authCookieOptions());
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: string; email: string } }): CurrentAdminDto {
    return { id: req.user.userId, email: req.user.email };
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // Passport redirects to Google; body never reached.
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(@Req() req: { user: AdminUser }, @Res() res: Response) {
    const { accessToken } = this.authService.login(req.user);
    this.setAuthCookie(res, accessToken);
    res.redirect(`${this.frontendUrl()}/admin`);
  }
}
