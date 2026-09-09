import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BooksService, UPLOAD_ROOT } from './books.service';
import { AssignDto, CreateBookDto, EvaluateDto, PublishDto, RevisionDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtPayload } from '../common/types';

const MANUSCRIPT_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

function sanitizeFileName(name: string): string {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path
    .basename(name, path.extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'naskah';
  return `${base}${ext}`;
}

export const manuscriptStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT(), 'manuscripts');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizeFileName(file.originalname)}`);
  },
});

const manuscriptInterceptor = FileInterceptor('file', {
  storage: manuscriptStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extOk = ['.pdf', '.docx', '.doc'].includes(path.extname(file.originalname).toLowerCase());
    if (!extOk || !MANUSCRIPT_MIME.includes(file.mimetype)) {
      return cb(new BadRequestException('Berkas naskah harus berformat PDF atau DOCX (maks. 20MB)'), false);
    }
    cb(null, true);
  },
});

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  /** Etalase publik — tanpa autentikasi. */
  @Get('public-catalog')
  publicCatalog(@Query('search') search?: string, @Query('category') category?: string) {
    return this.books.publicCatalog(search, category);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'LPPM')
  my(@CurrentUser() user: JwtPayload) {
    return this.books.listMine(user.sub);
  }

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('REVIEWER', 'EDITOR')
  assigned(@CurrentUser() user: JwtPayload) {
    return this.books.listAssigned(user.sub, user.role as 'REVIEWER' | 'EDITOR');
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LPPM')
  all(@Query('status') status?: string, @Query('search') search?: string, @Query('category') category?: string) {
    return this.books.listAll({ status, search, category });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.books.detail(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'LPPM')
  @UseInterceptors(manuscriptInterceptor)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookDto, @UploadedFile() file: Express.Multer.File) {
    return this.books.create(user, dto, file);
  }

  @Post(':id/revisions')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'LPPM')
  @UseInterceptors(manuscriptInterceptor)
  uploadRevision(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.books.uploadRevision(user, id, dto.notes, file);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LPPM')
  assign(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignDto) {
    return this.books.assign(user, id, dto);
  }

  @Post(':id/evaluate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('REVIEWER', 'EDITOR', 'LPPM')
  evaluate(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: EvaluateDto) {
    return this.books.evaluate(user, id, dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LPPM')
  @UseInterceptors(manuscriptInterceptor)
  publish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.books.publish(user, id, dto.isbn, file);
  }

  @Get('files/:fileId/download')
  @UseGuards(JwtAuthGuard)
  async download(@Param('fileId', ParseUUIDPipe) fileId: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const { absolutePath, fileName } = await this.books.getFileForDownload(fileId, user);
    if (!fs.existsSync(absolutePath) || !path.resolve(absolutePath).startsWith(path.resolve(UPLOAD_ROOT()))) {
      throw new BadRequestException('Berkas tidak tersedia');
    }
    res.download(absolutePath, fileName);
  }
}
