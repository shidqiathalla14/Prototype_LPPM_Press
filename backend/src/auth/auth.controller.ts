import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ImpersonateDto, LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { JwtPayload } from '../common/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('impersonate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  impersonate(@CurrentUser() user: JwtPayload, @Body() dto: ImpersonateDto) {
    return this.auth.impersonate(user, dto);
  }

  @Post('stop-impersonation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  stopImpersonation(@CurrentUser() user: JwtPayload) {
    return this.auth.stopImpersonation(user);
  }
}
