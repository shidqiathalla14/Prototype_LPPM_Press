import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import * as bcrypt from 'bcrypt';
import { KNEX } from '../database/knex.module';
import { ImpersonateDto, LoginDto, RegisterDto } from './dto';
import { JwtPayload, Role, UserRow } from '../common/types';

const PUBLIC_FIELDS = ['id', 'email', 'full_name', 'identifier_number', 'institution', 'faculty', 'phone_number', 'role', 'created_at'] as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject(KNEX) private readonly db: Knex,
    private readonly jwt: JwtService,
  ) {}

  private sign(user: UserRow, effectiveRole: Role, impersonating: boolean): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: effectiveRole,
      real_role: user.role,
      impersonating,
      full_name: user.full_name,
    };
    return this.jwt.sign(payload);
  }

  async register(dto: RegisterDto) {
    const exists = await this.db('users').where({ email: dto.email.toLowerCase() }).first();
    if (exists) throw new ConflictException('Email sudah terdaftar');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db('users')
      .insert({
        email: dto.email.toLowerCase(),
        password_hash,
        full_name: dto.full_name,
        identifier_number: dto.identifier_number || null,
        faculty: dto.faculty || null,
        phone_number: dto.phone_number || null,
        role: 'AUTHOR',
      })
      .returning(PUBLIC_FIELDS as unknown as string[]);
    return { message: 'Registrasi berhasil. Silakan masuk.', userId: user.id, user };
  }

  async login(dto: LoginDto) {
    const user = (await this.db('users').where({ email: dto.email.toLowerCase() }).first()) as UserRow | undefined;
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Email atau kata sandi salah');
    }
    const access_token = this.sign(user, user.role, false);
    const { password_hash, ...safe } = user;
    return { access_token, role: user.role, user: safe };
  }

  async impersonate(actor: JwtPayload, dto: ImpersonateDto) {
    if (actor.real_role !== 'LPPM') {
      throw new ForbiddenException('Hanya akun LPPM yang dapat menggunakan fitur See as...');
    }
    const user = (await this.db('users').where({ id: actor.sub }).first()) as UserRow;
    const impersonation_token = this.sign(user, dto.target_role, true);
    return { impersonation_token, simulated_role: dto.target_role };
  }

  async stopImpersonation(actor: JwtPayload) {
    if (actor.real_role !== 'LPPM' || !actor.impersonating) {
      throw new ForbiddenException('Tidak ada sesi impersonasi aktif');
    }
    const user = (await this.db('users').where({ id: actor.sub }).first()) as UserRow;
    const { password_hash, ...safe } = user;
    return { access_token: this.sign(user, 'LPPM', false), role: 'LPPM' as Role, user: safe };
  }
}
