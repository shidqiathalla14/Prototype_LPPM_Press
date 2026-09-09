import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  full_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  identifier_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  faculty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone_number?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Kata sandi lama wajib diisi' })
  current_password: string;

  @IsString()
  @MinLength(8, { message: 'Kata sandi baru minimal 8 karakter' })
  @Matches(/(?=.*[A-Za-z])(?=.*[0-9])/, { message: 'Kata sandi baru wajib mengandung huruf dan angka' })
  new_password: string;
}
