import { Body, Controller, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ImpersonateDto, LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { JwtPayload } from '../common/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setSessionCookie(res: Response, token: string) {
    res.setHeader('Cache-Control', 'no-store');
    res.cookie('lppm_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto).then((result) => {
      this.setSessionCookie(res, result.access_token);
      return result;
    });
  }

  @Post('impersonate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  impersonate(@CurrentUser() user: JwtPayload, @Body() dto: ImpersonateDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.impersonate(user, dto).then((result) => {
      this.setSessionCookie(res, result.impersonation_token);
      return result;
    });
  }

  @Post('stop-impersonation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  stopImpersonation(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    return this.auth.stopImpersonation(user).then((result) => {
      this.setSessionCookie(res, result.access_token);
      return result;
    });
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.clearCookie('lppm_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
