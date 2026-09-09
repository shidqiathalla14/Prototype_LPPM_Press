import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import * as path from 'path';
import { KNEX } from '../database/knex.module';
import { MailService } from '../mail/mail.service';
import { BooksService, UPLOAD_ROOT } from '../books/books.service';
import { BookRow, JwtPayload, UserRow } from '../common/types';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(KNEX) private readonly db: Knex,
    private readonly books: BooksService,
    private readonly mail: MailService,
  ) {}

  async uploadProof(author: JwtPayload, bookId: string, amount: number, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Bukti pembayaran wajib diunggah (JPG/PNG/PDF, maks. 5MB)');
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Nominal pembayaran tidak valid');
    const book = (await this.db('books').where({ id: bookId }).first()) as BookRow | undefined;
    if (!book) throw new NotFoundException('Naskah tidak ditemukan');
    if (book.author_id !== author.sub) throw new ForbiddenException('Hanya penulis yang dapat mengunggah bukti pembayaran');
    if (book.status !== 'PAYMENT_REQUIRED') {
      throw new BadRequestException(`Bukti pembayaran hanya dapat diunggah saat status PAYMENT_REQUIRED (status saat ini: ${book.status})`);
    }

    const relPath = path.relative(UPLOAD_ROOT(), file.path);
    const payment = await this.db.transaction(async (trx) => {
      const existing = await trx('payments').where({ book_id: bookId }).first();
      if (existing) {
        if (existing.status === 'VERIFIED') throw new BadRequestException('Pembayaran telah diverifikasi');
        const [p] = await trx('payments')
          .where({ id: existing.id })
          .update({
            amount, proof_url: relPath, status: 'PENDING', rejection_reason: null,
            verified_by: null, verified_at: null, updated_at: trx.fn.now(),
          })
          .returning('*');
        return p;
      }
      const [p] = await trx('payments')
        .insert({ book_id: bookId, author_id: author.sub, amount, proof_url: relPath, status: 'PENDING' })
        .returning('*');
      return p;
    });
    return payment;
  }

  async verify(actor: JwtPayload, paymentId: string, isApproved: boolean, rejectionReason?: string) {
    const payment = await this.db('payments').where({ id: paymentId }).first();
    if (!payment) throw new NotFoundException('Data pembayaran tidak ditemukan');
    if (payment.status === 'VERIFIED') throw new BadRequestException('Pembayaran sudah diverifikasi sebelumnya');

    const result = await this.db.transaction(async (trx) => {
      const [p] = await trx('payments')
        .where({ id: paymentId })
        .update({
          status: isApproved ? 'VERIFIED' : 'REJECTED',
          rejection_reason: isApproved ? null : rejectionReason || null,
          verified_by: actor.sub,
          verified_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning('*');
      if (isApproved) {
        await this.books.markPaymentVerified(trx, p.book_id, actor.sub);
      } else {
        await this.books.markPaymentRejected(trx, p.book_id, actor.sub, rejectionReason || 'Bukti pembayaran ditolak');
      }
      return p;
    });

    const book = (await this.db('books').where({ id: result.book_id }).first()) as BookRow;
    const author = (await this.db('users').where({ id: book.author_id }).first()) as UserRow;
    if (author) {
      if (isApproved) void this.mail.paymentVerified(author.email, author.full_name, book.title);
      else void this.mail.paymentRejected(author.email, author.full_name, book.title, rejectionReason || '-');
    }
    return result;
  }

  listPending() {
    return this.db('payments')
      .leftJoin('books', 'payments.book_id', 'books.id')
      .leftJoin('users', 'payments.author_id', 'users.id')
      .select('payments.*', 'books.title as book_title', 'users.full_name as author_name')
      .orderBy('payments.created_at', 'desc');
  }

  async getProofForDownload(paymentId: string, user: JwtPayload) {
    const payment = await this.db('payments').where({ id: paymentId }).first();
    if (!payment) throw new NotFoundException('Data pembayaran tidak ditemukan');
    const book = (await this.db('books').where({ id: payment.book_id }).first()) as BookRow;
    const allowed = user.role === 'LPPM' || book.author_id === user.sub;
    if (!allowed) throw new ForbiddenException('Anda tidak memiliki akses ke bukti pembayaran ini');
    return {
      absolutePath: path.join(UPLOAD_ROOT(), payment.proof_url),
      fileName: `bukti-pembayaran-${payment.id}${path.extname(payment.proof_url)}`,
    };
  }
}
