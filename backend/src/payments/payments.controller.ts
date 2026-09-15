import {
  BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { PaymentsService } from './payments.service';
import { RefundPaymentDto, UploadPaymentDto, VerifyPaymentDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtPayload } from '../common/types';
import { UPLOAD_ROOT } from '../books/books.service';

const PROOF_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

const proofInterceptor = FileInterceptor('proof_file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_ROOT(), 'payments');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extOk = ['.pdf', '.jpg', '.jpeg', '.png'].includes(path.extname(file.originalname).toLowerCase());
    if (!extOk || !PROOF_MIME.includes(file.mimetype)) {
      return cb(new BadRequestException('Bukti pembayaran harus JPG, PNG, atau PDF (maks. 5MB)'), false);
    }
    cb(null, true);
  },
});

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':bookId')
  @Roles('AUTHOR', 'LPPM')
  @UseInterceptors(proofInterceptor)
  upload(
    @CurrentUser() user: JwtPayload,
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UploadPaymentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.payments.uploadProof(user, bookId, parseFloat(dto.amount), file);
  }

  @Patch(':paymentId/verify')
  @Roles('LPPM')
  verify(@CurrentUser() user: JwtPayload, @Param('paymentId', ParseUUIDPipe) paymentId: string, @Body() dto: VerifyPaymentDto) {
    return this.payments.verify(user, paymentId, dto.is_approved, dto.rejection_reason);
  }

  @Patch(':paymentId/refund')
  @Roles('LPPM')
  refund(@CurrentUser() user: JwtPayload, @Param('paymentId', ParseUUIDPipe) paymentId: string, @Body() dto: RefundPaymentDto) {
    return this.payments.refund(user, paymentId, parseFloat(dto.amount), dto.method, dto.reference, dto.notes);
  }

  @Get()
  @Roles('LPPM')
  list() {
    return this.payments.listPending();
  }

  @Get(':paymentId/proof')
  async proof(@Param('paymentId', ParseUUIDPipe) paymentId: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const { absolutePath, fileName } = await this.payments.getProofForDownload(paymentId, user);
    if (!fs.existsSync(absolutePath) || !path.resolve(absolutePath).startsWith(path.resolve(UPLOAD_ROOT()))) {
      throw new BadRequestException('Berkas tidak tersedia');
    }
    res.set('Cache-Control', 'no-store');
    res.download(absolutePath, fileName);
  }
}
