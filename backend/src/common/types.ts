export type Role = 'AUTHOR' | 'REVIEWER' | 'EDITOR' | 'LPPM';

export type BookStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'REVISION_REVIEW'
  | 'IN_EDIT'
  | 'REVISION_EDIT'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_VERIFIED'
  | 'GETTING_ISBN'
  | 'REFUND_REQUIRED'
  | 'REFUNDED'
  | 'COMPLETED';

export type FileStage = 'INITIAL' | 'REVISION_REVIEW' | 'REVISION_EDIT' | 'FINAL_PUBLISHED';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REFUNDED';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role; // role efektif (berubah saat impersonasi)
  real_role: Role; // role asli di database
  impersonating: boolean;
  full_name: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  identifier_number: string | null;
  institution: string;
  faculty: string | null;
  phone_number: string | null;
  role: Role;
  created_at: Date;
  updated_at: Date;
}

export interface BookRow {
  id: string;
  author_id: string;
  reviewer_id: string | null;
  editor_id: string | null;
  title: string;
  abstract: string;
  category: string;
  status: BookStatus;
  isbn: string | null;
  cover_image_url: string | null;
  final_book_url: string | null;
  review_approved_at: Date | null;
  editorial_approved_at: Date | null;
  superseded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BookFileRow {
  id: string;
  book_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  version: number;
  stage: FileStage;
  notes: string | null;
  created_at: Date;
}
