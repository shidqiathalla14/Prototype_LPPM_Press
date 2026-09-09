import { Body, Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Knex } from 'knex';
import { KNEX } from '../database/knex.module';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtPayload } from '../common/types';

export class BugReportDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul kendala wajib diisi' })
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi kendala wajib diisi' })
  description: string;

  @IsOptional()
  @IsString()
  screenshot_url?: string;
}

@Injectable()
export class SettingsService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  submitBugReport(userId: string, dto: BugReportDto) {
    return this.db('bug_reports')
      .insert({ user_id: userId, subject: dto.subject, description: dto.description, screenshot_url: dto.screenshot_url || null })
      .returning(['id', 'subject', 'created_at']);
  }

  listBugReports() {
    return this.db('bug_reports')
      .leftJoin('users', 'bug_reports.user_id', 'users.id')
      .select('bug_reports.*', 'users.full_name as reporter_name', 'users.email as reporter_email')
      .orderBy('bug_reports.created_at', 'desc');
  }
}

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Post('bug-report')
  bugReport(@CurrentUser() user: JwtPayload, @Body() dto: BugReportDto) {
    return this.settings.submitBugReport(user.sub, dto);
  }

  @Get('bug-reports')
  @Roles('LPPM')
  listBugReports() {
    return this.settings.listBugReports();
  }
}

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
