export type Role = 'AUTHOR' | 'REVIEWER' | 'EDITOR' | 'LPPM';

export type BookStatus =
  | 'SUBMITTED' | 'IN_REVIEW' | 'REVISION_REVIEW' | 'IN_EDIT' | 'REVISION_EDIT'
  | 'PAYMENT_REQUIRED' | 'PAYMENT_VERIFIED' | 'GETTING_ISBN' | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  full_name: string;
  identifier_number: string | null;
  institution: string;
  faculty: string | null;
  phone_number: string | null;
  role: Role;
  created_at: string;
}

export interface BookFile {
  id: string;
  version: number;
  stage: string;
  file_name: string;
  file_size_bytes: number;
  notes: string | null;
  created_at: string;
  uploaded_by_name?: string;
}

export interface ReviewLog {
  id: string;
  role_type: Role;
  decision: 'REQUEST_REVISION' | 'APPROVED';
  notes: string;
  created_at: string;
  reviewer_name?: string;
}

export interface Payment {
  id: string;
  book_id: string;
  amount: number;
  proof_url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  book_title?: string;
  author_name?: string;
}

export interface HistoryItem {
  id: string;
  from_status: BookStatus | null;
  to_status: BookStatus;
  action: string;
  notes: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface NotificationItem extends HistoryItem {
  book_id: string;
  book_title: string;
}

export interface Book {
  id: string;
  author_id: string;
  reviewer_id: string | null;
  editor_id: string | null;
  title: string;
  abstract: string;
  category: string;
  status: BookStatus;
  isbn: string | null;
  final_book_url: string | null;
  created_at: string;
  updated_at: string;
  current_version?: number;
  author_name?: string;
  reviewer_name?: string;
  editor_name?: string;
  files?: BookFile[];
  review_logs?: ReviewLog[];
  payment?: Payment | null;
  history?: HistoryItem[];
}

export interface PaginatedBooks {
  items: Book[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
}

export interface CatalogResponse {
  items: Book[];
  categories: string[];
  stats: { published: number; authors: number };
}

export const STATUS_LABEL: Record<BookStatus, string> = {
  SUBMITTED: 'Terkirim',
  IN_REVIEW: 'Dalam Review',
  REVISION_REVIEW: 'Revisi (Reviewer)',
  IN_EDIT: 'Dalam Editing',
  REVISION_EDIT: 'Revisi (Editor)',
  PAYMENT_REQUIRED: 'Menunggu Pembayaran',
  PAYMENT_VERIFIED: 'Pembayaran Terverifikasi',
  GETTING_ISBN: 'Pengurusan ISBN',
  COMPLETED: 'Terbit',
};

export const STATUS_BADGE_CLASS: Record<BookStatus, string> = {
  SUBMITTED: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
  IN_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  REVISION_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  IN_EDIT: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  REVISION_EDIT: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  PAYMENT_REQUIRED: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  PAYMENT_VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  GETTING_ISBN: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  COMPLETED: 'bg-[#EAF5EE] text-[#143823] border-[#1E6F3D]/30 font-semibold dark:bg-[#143823]/60 dark:text-[#EAF5EE] dark:border-[#238636]',
};

export const WORKFLOW_STEPS: { status: BookStatus; label: string }[] = [
  { status: 'SUBMITTED', label: 'Pengajuan' },
  { status: 'IN_REVIEW', label: 'Review' },
  { status: 'IN_EDIT', label: 'Editing' },
  { status: 'PAYMENT_REQUIRED', label: 'Pembayaran' },
  { status: 'GETTING_ISBN', label: 'ISBN' },
  { status: 'COMPLETED', label: 'Terbit' },
];

export function workflowProgress(status: BookStatus): number {
  switch (status) {
    case 'SUBMITTED': return 0;
    case 'IN_REVIEW':
    case 'REVISION_REVIEW': return 1;
    case 'IN_EDIT':
    case 'REVISION_EDIT': return 2;
    case 'PAYMENT_REQUIRED': return 3;
    case 'PAYMENT_VERIFIED': return 4;
    case 'GETTING_ISBN': return 4;
    case 'COMPLETED': return 5;
  }
}
