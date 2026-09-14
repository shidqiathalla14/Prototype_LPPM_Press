/**
 * Migrasi database LPPM Press UPNVJ.
 * Idempotent — aman dijalankan berulang kali.
 * Jalankan: npm run migrate
 */
import 'dotenv/config';
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'lppm',
    password: process.env.DATABASE_PASSWORD || 'lppm_secret',
    database: process.env.DATABASE_NAME || 'lppm_press',
  },
});

async function migrate() {
  await db.raw(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await db.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('AUTHOR','REVIEWER','EDITOR','LPPM');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE book_status AS ENUM (
        'SUBMITTED','IN_REVIEW','REVISION_REVIEW','IN_EDIT','REVISION_EDIT',
        'PAYMENT_REQUIRED','PAYMENT_VERIFIED','GETTING_ISBN','COMPLETED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE file_stage AS ENUM ('INITIAL','REVISION_REVIEW','REVISION_EDIT','FINAL_PUBLISHED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE payment_status AS ENUM ('PENDING','VERIFIED','REJECTED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);

  await db.raw(`
    ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'REFUND_REQUIRED';
    ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'REFUNDED';
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'REFUNDED';
  `);

  await db.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      identifier_number VARCHAR(50),
      institution VARCHAR(255) DEFAULT 'UPN Veteran Jakarta',
      faculty VARCHAR(150),
      phone_number VARCHAR(25),
      role user_role NOT NULL DEFAULT 'AUTHOR',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS books (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      editor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(500) NOT NULL,
      abstract TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      status book_status NOT NULL DEFAULT 'SUBMITTED',
      isbn VARCHAR(50),
      cover_image_url VARCHAR(500),
      final_book_url VARCHAR(500),
      review_approved_at TIMESTAMPTZ,
      editorial_approved_at TIMESTAMPTZ,
      superseded_by UUID REFERENCES books(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);
    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_reviewer_id ON books(reviewer_id);
    CREATE INDEX IF NOT EXISTS idx_books_editor_id ON books(editor_id);

    CREATE TABLE IF NOT EXISTS book_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      uploaded_by UUID NOT NULL REFERENCES users(id),
      file_path VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      version INT NOT NULL DEFAULT 1,
      stage file_stage NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_book_files_book_id ON book_files(book_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_book_files_version ON book_files(book_id, version);

    CREATE TABLE IF NOT EXISTS review_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      reviewer_user_id UUID NOT NULL REFERENCES users(id),
      role_type user_role NOT NULL,
      decision VARCHAR(50) NOT NULL CHECK (decision IN ('REQUEST_REVISION','APPROVED')),
      notes TEXT NOT NULL,
      annotated_file_url VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_review_logs_book_id ON review_logs(book_id);

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id UUID NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id),
      amount NUMERIC(12,2) NOT NULL,
      proof_url VARCHAR(500) NOT NULL,
      status payment_status NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT,
      verified_by UUID REFERENCES users(id),
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_method VARCHAR(100);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(255);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_notes TEXT;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

    CREATE TABLE IF NOT EXISTS book_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      from_status book_status,
      to_status book_status NOT NULL,
      action VARCHAR(100) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_history_book_id ON book_status_history(book_id);

    CREATE TABLE IF NOT EXISTS bug_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      screenshot_url VARCHAR(500),
      is_resolved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('Migrasi selesai: seluruh tabel & enum terverifikasi.');
  await db.destroy();
}

migrate().catch((e) => {
  console.error('Migrasi gagal:', e.message);
  process.exit(1);
});
