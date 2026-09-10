import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import * as path from 'path';
import { KNEX } from '../database/knex.module';
import { MailService } from '../mail/mail.service';
import { AssignDto, CreateBookDto, EvaluateDto } from './dto';
import { BookRow, BookStatus, JwtPayload, UserRow } from '../common/types';

export const UPLOAD_ROOT = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

/** Status yang mengunci naskah (Payment Lock) — perubahan berkas ditolak. */
export const LOCKED_STATUSES: BookStatus[] = [
  'PAYMENT_REQUIRED', 'PAYMENT_VERIFIED', 'GETTING_ISBN', 'REFUND_REQUIRED', 'REFUNDED', 'COMPLETED',
];

@Injectable()
export class BooksService {
  constructor(
    @Inject(KNEX) private readonly db: Knex,
    private readonly mail: MailService,
  ) {}

  private async getBookOrFail(id: string): Promise<BookRow> {
    const book = (await this.db('books').where({ id }).first()) as BookRow | undefined;
    if (!book) throw new NotFoundException('Naskah tidak ditemukan');
    return book;
  }

  private async recordHistory(
    trx: Knex | Knex.Transaction,
    bookId: string,
    actorId: string | null,
    from: BookStatus | null,
    to: BookStatus,
    action: string,
    notes?: string,
  ) {
    await trx('book_status_history').insert({
      book_id: bookId, actor_id: actorId, from_status: from, to_status: to, action, notes: notes || null,
    });
  }

  private assertCanView(book: BookRow, user: JwtPayload) {
    const canView = user.real_role === 'LPPM'
      || (user.role === 'AUTHOR' && book.author_id === user.sub)
      || (user.role === 'REVIEWER' && book.reviewer_id === user.sub)
      || (user.role === 'EDITOR' && book.editor_id === user.sub);
    if (!canView) throw new ForbiddenException('Anda tidak memiliki akses ke naskah ini');
  }

  // ---------------- Query ----------------

  listMine(authorId: string) {
    return this.db('books')
      .select('books.*')
      .select(this.db.raw('(SELECT MAX(version) FROM book_files WHERE book_id = books.id) as current_version'))
      .where({ author_id: authorId })
      .whereNull('superseded_by')
      .orderBy('created_at', 'desc');
  }

  listAssigned(userId: string, role: 'REVIEWER' | 'EDITOR' | 'LPPM', isImpersonating = false) {
    if (role === 'LPPM' && !isImpersonating) {
      throw new ForbiddenException('Pilih mode Reviewer atau Editor untuk melihat daftar tugas');
    }
    const assignmentColumn = role === 'REVIEWER' ? 'books.reviewer_id' : 'books.editor_id';
    return this.db('books')
      .leftJoin('users as author', 'books.author_id', 'author.id')
      .select('books.*')
      .select(this.db.raw('(SELECT MAX(version) FROM book_files WHERE book_id = books.id) as current_version'))
      .select('author.full_name as author_name')
      .where(assignmentColumn, userId)
      .orderBy('books.updated_at', 'desc');
  }

  listAll(filters: { status?: string; search?: string; category?: string }) {
    let q = this.db('books')
      .leftJoin('users as author', 'books.author_id', 'author.id')
      .leftJoin('users as reviewer', 'books.reviewer_id', 'reviewer.id')
      .leftJoin('users as editor', 'books.editor_id', 'editor.id')
      .select('books.*', 'author.full_name as author_name', 'reviewer.full_name as reviewer_name', 'editor.full_name as editor_name')
      .orderBy('books.created_at', 'desc');
    if (filters.status) q = q.where('books.status', filters.status);
    if (filters.category) q = q.where('books.category', filters.category);
    if (filters.search) {
      q = q.where((b) =>
        b.whereILike('books.title', `%${filters.search}%`).orWhereILike('author.full_name', `%${filters.search}%`),
      );
    }
    return q;
  }

  async publicCatalog(search?: string, category?: string) {
    let q = this.db('books')
      .leftJoin('users as author', 'books.author_id', 'author.id')
      .select('books.id', 'books.title', 'books.abstract', 'books.category', 'books.isbn', 'books.cover_image_url', 'books.updated_at as published_at', 'author.full_name as author_name')
      .where('books.status', 'COMPLETED')
      .orderBy('books.updated_at', 'desc');
    if (search) {
      q = q.where((b) =>
        b.whereILike('books.title', `%${search}%`).orWhereILike('author.full_name', `%${search}%`).orWhereILike('books.isbn', `%${search}%`),
      );
    }
    if (category) q = q.where('books.category', category);
    const items = await q;
    const categories = await this.db('books').distinct('category').where('status', 'COMPLETED').orderBy('category');
    const totalAuthors = await this.db('users').where({ role: 'AUTHOR' }).count<{ count: string }>('* as count').first();
    return {
      items,
      categories: categories.map((c) => c.category),
      stats: { published: items.length, authors: parseInt(totalAuthors?.count || '0', 10) },
    };
  }

  async detail(id: string, user: JwtPayload) {
    const book = await this.db('books')
      .leftJoin('users as author', 'books.author_id', 'author.id')
      .leftJoin('users as reviewer', 'books.reviewer_id', 'reviewer.id')
      .leftJoin('users as editor', 'books.editor_id', 'editor.id')
      .select('books.*', 'author.full_name as author_name', 'author.email as author_email',
        'reviewer.full_name as reviewer_name', 'editor.full_name as editor_name')
      .where('books.id', id)
      .first();
    if (!book) throw new NotFoundException('Naskah tidak ditemukan');
    this.assertCanView(book as BookRow, user);

    const files = await this.db('book_files')
      .leftJoin('users', 'book_files.uploaded_by', 'users.id')
      .select('book_files.id', 'book_files.version', 'book_files.stage', 'book_files.file_name', 'book_files.file_size_bytes', 'book_files.notes', 'book_files.created_at', 'users.full_name as uploaded_by_name')
      .where('book_files.book_id', id)
      .orderBy('book_files.version', 'desc');

    const reviewLogs = await this.db('review_logs')
      .leftJoin('users', 'review_logs.reviewer_user_id', 'users.id')
      .select('review_logs.*', 'users.full_name as reviewer_name')
      .where('review_logs.book_id', id)
      .orderBy('review_logs.created_at', 'desc');

    const payment = await this.db('payments').where({ book_id: id }).first();
    const history = await this.db('book_status_history')
      .leftJoin('users', 'book_status_history.actor_id', 'users.id')
      .select('book_status_history.*', 'users.full_name as actor_name')
      .where('book_status_history.book_id', id)
      .orderBy('book_status_history.created_at', 'desc');

    return { ...book, files, review_logs: reviewLogs, payment: payment || null, history };
  }

  // ---------------- Mutasi ----------------

  async create(author: JwtPayload, dto: CreateBookDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Berkas naskah wajib diunggah (PDF/DOCX)');
    const book = await this.db.transaction(async (trx) => {
      const [b] = await trx('books')
        .insert({ author_id: author.sub, title: dto.title, abstract: dto.abstract, category: dto.category, status: 'SUBMITTED' })
        .returning('*');
      await trx('book_files').insert({
        book_id: b.id, uploaded_by: author.sub, file_path: path.relative(UPLOAD_ROOT(), file.path),
        file_name: file.originalname, file_size_bytes: file.size, version: 1, stage: 'INITIAL',
      });
      await this.recordHistory(trx, b.id, author.sub, null, 'SUBMITTED', 'SUBMIT', 'Pengajuan naskah baru (v1)');
      return b;
    });
    return book;
  }

  async uploadRevision(author: JwtPayload, bookId: string, notes: string | undefined, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Berkas revisi wajib diunggah (PDF/DOCX)');
    const book = await this.getBookOrFail(bookId);
    if (book.author_id !== author.sub) throw new ForbiddenException('Hanya penulis naskah yang dapat mengunggah revisi');
    if (LOCKED_STATUSES.includes(book.status)) {
      throw new ForbiddenException('Naskah telah FINAL dan terkunci sejak tahap pembayaran. Perubahan berkas tidak diizinkan.');
    }
    if (book.status !== 'REVISION_REVIEW' && book.status !== 'REVISION_EDIT') {
      throw new BadRequestException(`Revisi hanya dapat diunggah saat status REVISION_REVIEW atau REVISION_EDIT (status saat ini: ${book.status})`);
    }
    const nextStatus: BookStatus = book.status === 'REVISION_REVIEW' ? 'IN_REVIEW' : 'IN_EDIT';
    const stage = book.status; // REVISION_REVIEW / REVISION_EDIT

    const result = await this.db.transaction(async (trx) => {
      const maxV = await trx('book_files').where({ book_id: bookId }).max<{ max: number | null }>('version as max').first();
      const version = (maxV?.max || 0) + 1;
      const [f] = await trx('book_files')
        .insert({
          book_id: bookId, uploaded_by: author.sub, file_path: path.relative(UPLOAD_ROOT(), file.path),
          file_name: file.originalname, file_size_bytes: file.size, version, stage, notes: notes || null,
        })
        .returning('*');
      await trx('books').where({ id: bookId }).update({ status: nextStatus, updated_at: trx.fn.now() });
      await this.recordHistory(trx, bookId, author.sub, book.status, nextStatus, 'UPLOAD_REVISION', `Revisi v${version} diunggah`);
      return { version, file: f, status: nextStatus };
    });

    const assigneeId = book.status === 'REVISION_REVIEW' ? book.reviewer_id : book.editor_id;
    if (assigneeId) {
      const assignee = (await this.db('users').where({ id: assigneeId }).first()) as UserRow;
      if (assignee) void this.mail.revisionUploaded(assignee.email, assignee.full_name, book.title, result.version);
    }
    return result;
  }

  async assign(actor: JwtPayload, bookId: string, dto: AssignDto) {
    if (!dto.reviewer_id && !dto.editor_id) throw new BadRequestException('Pilih reviewer atau editor yang akan ditugaskan');
    const book = await this.getBookOrFail(bookId);
    if (LOCKED_STATUSES.includes(book.status)) {
      throw new BadRequestException('Naskah dalam tahap pembayaran/ISBN — penugasan tidak dapat diubah');
    }

    const result = await this.db.transaction(async (trx) => {
      const updates: Record<string, unknown> = { updated_at: trx.fn.now() };
      let action = '';
      let assignee: UserRow | undefined;
      let roleLabel = '';

      if (dto.reviewer_id) {
        const reviewer = (await trx('users').where({ id: dto.reviewer_id, role: 'REVIEWER' }).first()) as UserRow | undefined;
        if (!reviewer) throw new BadRequestException('Pengguna tersebut bukan Reviewer');
        if (book.status !== 'SUBMITTED' && book.reviewer_id !== dto.reviewer_id && !['IN_REVIEW', 'REVISION_REVIEW'].includes(book.status)) {
          throw new BadRequestException(`Penugasan reviewer hanya pada tahap review (status: ${book.status})`);
        }
        updates.reviewer_id = reviewer.id;
        if (book.status === 'SUBMITTED') updates.status = 'IN_REVIEW';
        assignee = reviewer; roleLabel = 'Reviewer Substantif'; action = 'ASSIGN_REVIEWER';
      }
      if (dto.editor_id) {
        const editor = (await trx('users').where({ id: dto.editor_id, role: 'EDITOR' }).first()) as UserRow | undefined;
        if (!editor) throw new BadRequestException('Pengguna tersebut bukan Editor');
        if (!book.review_approved_at && book.status === 'IN_REVIEW') {
          throw new BadRequestException('Editor baru dapat ditugaskan setelah Reviewer menyetujui naskah');
        }
        updates.editor_id = editor.id;
        if (['IN_REVIEW', 'REVISION_REVIEW'].includes(book.status) && book.review_approved_at) updates.status = 'IN_EDIT';
        assignee = editor; roleLabel = 'Editor Tata Letak & Bahasa'; action = 'ASSIGN_EDITOR';
      }

      await trx('books').where({ id: bookId }).update(updates);
      const updated = (await trx('books').where({ id: bookId }).first()) as BookRow;
      await this.recordHistory(trx, bookId, actor.sub, book.status, updated.status, action,
        assignee ? `${roleLabel}: ${assignee.full_name}` : undefined);
      return { book: updated, assignee, roleLabel };
    });

    if (result.assignee) {
      void this.mail.assigned(result.assignee.email, result.assignee.full_name, book.title, result.roleLabel);
    }
    return result.book;
  }

  async evaluate(actor: JwtPayload, bookId: string, dto: EvaluateDto) {
    const book = await this.getBookOrFail(bookId);
    if (LOCKED_STATUSES.includes(book.status)) {
      throw new ForbiddenException('Naskah telah FINAL dan terkunci — evaluasi tidak dapat diubah');
    }

    const isReviewer = actor.role === 'REVIEWER';
    const expectedStatus: BookStatus = isReviewer ? 'IN_REVIEW' : 'IN_EDIT';
    const assignedId = isReviewer ? book.reviewer_id : book.editor_id;

    if (assignedId !== actor.sub) throw new ForbiddenException('Naskah ini tidak ditugaskan kepada Anda');
    if (book.status !== expectedStatus) {
      throw new BadRequestException(`Evaluasi hanya dapat dilakukan saat status ${expectedStatus} (status saat ini: ${book.status})`);
    }

    let nextStatus: BookStatus;
    if (dto.decision === 'REQUEST_REVISION') {
      nextStatus = isReviewer ? 'REVISION_REVIEW' : 'REVISION_EDIT';
    } else {
      nextStatus = isReviewer ? 'IN_REVIEW' : 'PAYMENT_REQUIRED';
    }

    await this.db.transaction(async (trx) => {
      await trx('review_logs').insert({
        book_id: bookId, reviewer_user_id: actor.sub, role_type: actor.role,
        decision: dto.decision, notes: dto.notes,
      });
      const updates: Record<string, unknown> = { status: nextStatus, updated_at: trx.fn.now() };
      if (dto.decision === 'APPROVED' && isReviewer) updates.review_approved_at = trx.fn.now();
      if (dto.decision === 'APPROVED' && !isReviewer) updates.editorial_approved_at = trx.fn.now();
      await trx('books').where({ id: bookId }).update(updates);
      await this.recordHistory(trx, bookId, actor.sub, book.status, nextStatus,
        `${isReviewer ? 'REVIEW' : 'EDITORIAL'}_${dto.decision}`, dto.notes);
    });

    const author = (await this.db('users').where({ id: book.author_id }).first()) as UserRow;
    if (author) {
      if (dto.decision === 'REQUEST_REVISION') {
        void this.mail.revisionRequested(author.email, author.full_name, book.title, dto.notes, !isReviewer);
      } else if (!isReviewer) {
        void this.mail.paymentRequired(author.email, author.full_name, book.title, 1500000);
      }
    }
    return { status: nextStatus, message: dto.decision === 'APPROVED' ? 'Tahapan disetujui' : 'Permintaan revisi dikirim ke penulis' };
  }

  /** Dipanggil PaymentsModule setelah verifikasi — menggeser status buku. */
  async markPaymentVerified(trx: Knex.Transaction, bookId: string, actorId: string) {
    const book = (await trx('books').where({ id: bookId }).first()) as BookRow;
    await this.recordHistory(trx, bookId, actorId, book.status, 'PAYMENT_VERIFIED', 'PAYMENT_VERIFY', 'Pembayaran diverifikasi LPPM');
    await trx('books').where({ id: bookId }).update({ status: 'GETTING_ISBN', updated_at: trx.fn.now() });
    await this.recordHistory(trx, bookId, actorId, 'PAYMENT_VERIFIED', 'GETTING_ISBN', 'ISBN_REQUEST', 'Pengajuan ISBN ke Perpusnas RI dimulai');
  }

  async markPaymentRejected(trx: Knex.Transaction, bookId: string, actorId: string, reason: string) {
    const book = (await trx('books').where({ id: bookId }).first()) as BookRow;
    await this.recordHistory(trx, bookId, actorId, book.status, 'PAYMENT_REQUIRED', 'PAYMENT_REJECT', reason);
  }

  async publish(actor: JwtPayload, bookId: string, isbn: string, file?: Express.Multer.File) {
    const book = await this.getBookOrFail(bookId);
    if (book.status !== 'GETTING_ISBN') {
      throw new BadRequestException(`Penerbitan hanya dapat dilakukan saat status GETTING_ISBN (status saat ini: ${book.status})`);
    }
    const updated = await this.db.transaction(async (trx) => {
      const updates: Record<string, unknown> = {
        isbn, status: 'COMPLETED', updated_at: trx.fn.now(),
      };
      if (file) {
        const maxV = await trx('book_files').where({ book_id: bookId }).max<{ max: number | null }>('version as max').first();
        const version = (maxV?.max || 0) + 1;
        await trx('book_files').insert({
          book_id: bookId, uploaded_by: actor.sub, file_path: path.relative(UPLOAD_ROOT(), file.path),
          file_name: file.originalname, file_size_bytes: file.size, version, stage: 'FINAL_PUBLISHED',
          notes: 'Berkas e-Book final ber-ISBN',
        });
        updates.final_book_url = path.relative(UPLOAD_ROOT(), file.path);
      }
      await trx('books').where({ id: bookId }).update(updates);
      await this.recordHistory(trx, bookId, actor.sub, 'GETTING_ISBN', 'COMPLETED', 'PUBLISH', `ISBN diterbitkan: ${isbn}`);
      return (await trx('books').where({ id: bookId }).first()) as BookRow;
    });

    const author = (await this.db('users').where({ id: book.author_id }).first()) as UserRow;
    if (author) void this.mail.published(author.email, author.full_name, book.title, isbn);
    return updated;
  }

  async rejectIsbn(actor: JwtPayload, bookId: string, reason: string) {
    const book = await this.getBookOrFail(bookId);
    if (book.status !== 'GETTING_ISBN') {
      throw new BadRequestException(`Penolakan ISBN hanya dapat dilakukan saat status GETTING_ISBN (status saat ini: ${book.status})`);
    }

    const updated = await this.db.transaction(async (trx) => {
      await trx('books').where({ id: bookId }).update({ status: 'REFUND_REQUIRED', updated_at: trx.fn.now() });
      await this.recordHistory(trx, bookId, actor.sub, 'GETTING_ISBN', 'REFUND_REQUIRED', 'ISBN_REJECT', reason);
      return (await trx('books').where({ id: bookId }).first()) as BookRow;
    });

    const author = (await this.db('users').where({ id: book.author_id }).first()) as UserRow;
    if (author) void this.mail.isbnRejected(author.email, author.full_name, book.title, reason);
    return updated;
  }

  async markRefunded(trx: Knex.Transaction, bookId: string, actorId: string, notes: string) {
    const book = (await trx('books').where({ id: bookId }).first()) as BookRow;
    await trx('books').where({ id: bookId }).update({ status: 'REFUNDED', updated_at: trx.fn.now() });
    await this.recordHistory(trx, bookId, actorId, book.status, 'REFUNDED', 'REFUND', notes);
  }

  /** Unduhan berkas naskah — dengan pemeriksaan otorisasi penuh. */
  async getFileForDownload(fileId: string, user: JwtPayload) {
    const file = await this.db('book_files').where({ id: fileId }).first();
    if (!file) throw new NotFoundException('Berkas tidak ditemukan');
    const book = await this.getBookOrFail(file.book_id);
    this.assertCanView(book, user);
    return { absolutePath: path.join(UPLOAD_ROOT(), file.file_path), fileName: file.file_name };
  }
}
