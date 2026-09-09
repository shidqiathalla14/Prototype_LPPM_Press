import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '../common/types';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Kata sandi minimal 8 karakter' })
  @Matches(/(?=.*[A-Za-z])(?=.*[0-9])/, { message: 'Kata sandi wajib mengandung huruf dan angka' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @MaxLength(255)
  full_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  identifier_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  faculty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone_number?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Kata sandi wajib diisi' })
  password: string;
}

export class ImpersonateDto {
  @IsIn(['AUTHOR', 'REVIEWER', 'EDITOR'], { message: 'Target role tidak valid' })
  target_role: Role;
}
