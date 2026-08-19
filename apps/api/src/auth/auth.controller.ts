import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
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

  private setAuthCookie(res: Response, accessToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

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
    res.clearCookie('access_token');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: string; email: string } }) {
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
    res.redirect(`${this.config.get('FRONTEND_URL')}/admin`);
  }
}
