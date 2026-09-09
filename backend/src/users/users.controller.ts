import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtPayload, Role } from '../common/types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.users.me(user.sub);
  }

  @Put('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.sub, dto);
  }

  @Put('me/password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.sub, dto);
  }

  @Get('me/contributions')
  contributions(@CurrentUser() user: JwtPayload) {
    return this.users.contributions(user.sub);
  }

  @Get('me/stats')
  stats(@CurrentUser() user: JwtPayload) {
    return this.users.dashboardStats(user.sub, user.role);
  }

  @Get('by-role/:role')
  @Roles('LPPM')
  listByRole(@Param('role') role: Role) {
    return this.users.listByRole(role);
  }
}
