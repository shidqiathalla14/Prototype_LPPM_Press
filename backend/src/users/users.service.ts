import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Knex } from 'knex';
import * as bcrypt from 'bcrypt';
import { KNEX } from '../database/knex.module';
import { ChangePasswordDto, UpdateProfileDto } from './dto';
import { JwtPayload, Role, UserRow } from '../common/types';

const PUBLIC_FIELDS = ['id', 'email', 'full_name', 'identifier_number', 'institution', 'faculty', 'phone_number', 'role', 'created_at'] as const;

@Injectable()
export class UsersService {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  me(userId: string) {
    return this.db('users').select(PUBLIC_FIELDS as unknown as string[]).where({ id: userId }).first();
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.db('users').where({ id: userId }).update({ ...dto, updated_at: this.db.fn.now() });
    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = (await this.db('users').where({ id: userId }).first()) as UserRow;
    if (!(await bcrypt.compare(dto.current_password, user.password_hash))) {
      throw new UnauthorizedException('Kata sandi lama salah');
    }
    const password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.db('users').where({ id: userId }).update({ password_hash, updated_at: this.db.fn.now() });
    return { message: 'Kata sandi berhasil diperbarui' };
  }

  contributions(userId: string) {
    return this.db('books')
      .select('id', 'title', 'category', 'isbn', 'final_book_url', 'updated_at as published_at')
      .where({ author_id: userId, status: 'COMPLETED' })
      .orderBy('updated_at', 'desc');
  }

  /** Daftar akun per role — digunakan LPPM untuk penugasan reviewer/editor. */
  listByRole(role: Role) {
    return this.db('users')
      .select('id', 'full_name', 'email', 'faculty')
      .where({ role })
      .orderBy('full_name', 'asc');
  }

  async dashboardStats(userId: string, role: Role) {
    if (role === 'AUTHOR') {
      const rows = await this.db('books').select('status').where({ author_id: userId });
      return {
        total: rows.length,
        inProgress: rows.filter((r) => !['COMPLETED'].includes(r.status)).length,
        completed: rows.filter((r) => r.status === 'COMPLETED').length,
      };
    }
    if (role === 'REVIEWER' || role === 'EDITOR') {
      const field = role === 'REVIEWER' ? 'reviewer_id' : 'editor_id';
      const activeStatuses = role === 'REVIEWER' ? ['IN_REVIEW'] : ['IN_EDIT'];
      const rows = await this.db('books').select('status').where({ [field]: userId });
      return {
        queue: rows.filter((r) => activeStatuses.includes(r.status)).length,
        done: rows.filter((r) => !activeStatuses.includes(r.status)).length,
        total: rows.length,
      };
    }
    const rows = await this.db('books').select('status');
    return {
      total: rows.length,
      completed: rows.filter((r) => r.status === 'COMPLETED').length,
      gettingIsbn: rows.filter((r) => r.status === 'GETTING_ISBN').length,
      paymentPending: await this.db('payments').where({ status: 'PENDING' }).count<{ count: string }>('* as count').first().then((r) => parseInt(r?.count || '0', 10)),
      inProgress: rows.filter((r) => !['COMPLETED'].includes(r.status)).length,
    };
  }

  async notifications(user: JwtPayload) {
    const query = this.db('book_status_history as history')
      .join('books', 'history.book_id', 'books.id')
      .leftJoin('users as actor', 'history.actor_id', 'actor.id')
      .select(
        'history.id',
        'history.book_id',
        'history.from_status',
        'history.to_status',
        'history.action',
        'history.notes',
        'history.created_at',
        'books.title as book_title',
        'actor.full_name as actor_name',
      )
      .orderBy('history.created_at', 'desc')
      .limit(8);

    if (user.role === 'AUTHOR') query.where('books.author_id', user.sub);
    if (user.role === 'REVIEWER') query.where('books.reviewer_id', user.sub);
    if (user.role === 'EDITOR') query.where('books.editor_id', user.sub);

    return query;
  }
}
