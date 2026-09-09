import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul naskah wajib diisi' })
  @MinLength(10, { message: 'Judul minimal 10 karakter' })
  @MaxLength(500)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Abstrak wajib diisi' })
  @MinLength(100, { message: 'Abstrak minimal 100 karakter' })
  abstract: string;

  @IsString()
  @IsNotEmpty({ message: 'Kategori keilmuan wajib diisi' })
  @MaxLength(100)
  category: string;
}

export class AssignDto {
  @IsOptional()
  @IsUUID('4', { message: 'reviewer_id harus UUID valid' })
  reviewer_id?: string;

  @IsOptional()
  @IsUUID('4', { message: 'editor_id harus UUID valid' })
  editor_id?: string;
}

export class EvaluateDto {
  @IsIn(['REQUEST_REVISION', 'APPROVED'], { message: 'Keputusan harus REQUEST_REVISION atau APPROVED' })
  decision: 'REQUEST_REVISION' | 'APPROVED';

  @IsString()
  @IsNotEmpty({ message: 'Catatan evaluasi wajib diisi' })
  @MinLength(10, { message: 'Catatan evaluasi minimal 10 karakter' })
  notes: string;
}

export class PublishDto {
  @IsString()
  @IsNotEmpty({ message: 'Nomor ISBN wajib diisi' })
  @Matches(/^97[89][\d-]{8,20}$/, { message: 'Format ISBN-13 tidak valid (contoh: 978-602-44125-1-7)' })
  isbn: string;
}

export class RevisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
