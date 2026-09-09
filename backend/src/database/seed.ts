/**
 * Seed data pengembangan — LPPM Press UPNVJ.
 * Seluruh akun demo memakai password: Password123!
 * Jalankan: npm run seed
 */
import knex from 'knex';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

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

const MINIMAL_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 60>>stream
BT /F1 14 Tf 72 720 Td (Naskah LPPM Press UPNVJ - Dokumen Seed) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
trailer<</Size 5/Root 1 0 R>>
startxref
0
%%EOF`;

function writeSeedPdf(relPath: string): number {
  const full = path.join(process.cwd(), 'uploads', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, MINIMAL_PDF);
  return Buffer.byteLength(MINIMAL_PDF);
}

async function seed() {
  const existing = await db('users').count<{ count: string }>('* as count').first();
  if (existing && parseInt(existing.count, 10) > 0) {
    console.log('Database sudah berisi data — seed dilewati.');
    await db.destroy();
    return;
  }

  const hash = await bcrypt.hash('Password123!', 10);

  const [lppm, reviewer, editor, author1, author2, author3] = await db('users')
    .insert([
      { email: 'lppm@upnvj.ac.id', password_hash: hash, full_name: 'Dr. Ratna Sari, M.Si. (Admin LPPM)', identifier_number: '0010117501', faculty: 'LPPM', phone_number: '0812-1000-0001', role: 'LPPM' },
      { email: 'reviewer@upnvj.ac.id', password_hash: hash, full_name: 'Prof. Dr. Bambang Riyanto, M.T.', identifier_number: '0025036802', faculty: 'Fakultas Teknik', phone_number: '0812-1000-0002', role: 'REVIEWER' },
      { email: 'editor@upnvj.ac.id', password_hash: hash, full_name: 'Dra. Siti Maemunah, M.Hum.', identifier_number: '0018057203', faculty: 'Fakultas Ilmu Sosial dan Ilmu Politik', phone_number: '0812-1000-0003', role: 'EDITOR' },
      { email: 'author@upnvj.ac.id', password_hash: hash, full_name: 'Dr. Andi Wijaya, S.T., M.T.', identifier_number: '0410128801', faculty: 'Fakultas Teknik', phone_number: '0812-1000-0004', role: 'AUTHOR' },
      { email: 'author2@upnvj.ac.id', password_hash: hash, full_name: 'Dr. Dewi Lestari, S.E., M.M.', identifier_number: '0420067902', faculty: 'Fakultas Ekonomi dan Bisnis', phone_number: '0812-1000-0005', role: 'AUTHOR' },
      { email: 'author3@upnvj.ac.id', password_hash: hash, full_name: 'Rizky Pratama, S.H., M.H.', identifier_number: '0430119003', faculty: 'Fakultas Hukum', phone_number: '0812-1000-0006', role: 'AUTHOR' },
    ])
    .returning('*');

  const mkFile = (bookId: string, by: string, version: number, stage: string, name: string, notes: string | null, daysAgo: number) => {
    const rel = `seed/${bookId}-v${version}.pdf`;
    const size = writeSeedPdf(rel);
    return {
      book_id: bookId, uploaded_by: by, file_path: rel, file_name: name,
      file_size_bytes: size, version, stage, notes,
      created_at: db.raw(`NOW() - INTERVAL '${daysAgo} days'`),
    };
  };

  // ---- 1. Buku COMPLETED (katalog publik) ----
  const [b1] = await db('books').insert({
    author_id: author2.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Metodologi Penelitian Kuantitatif untuk Ilmu Sosial',
    abstract: 'Buku ajar ini membahas secara komprehensif paradigma penelitian kuantitatif, mulai dari perumusan hipotesis, desain survei, teknik sampling, hingga analisis data statistik deskriptif dan inferensial. Disusun untuk mendukung mata kuliah metodologi penelitian di lingkungan UPN Veteran Jakarta.',
    category: 'Ilmu Sosial', status: 'COMPLETED', isbn: '978-602-44125-1-7',
    final_book_url: 'seed/final-metodologi.pdf',
    created_at: db.raw(`NOW() - INTERVAL '120 days'`),
  }).returning('*');
  writeSeedPdf('seed/final-metodologi.pdf');
  await db('book_files').insert([
    mkFile(b1.id, author2.id, 1, 'INITIAL', 'Naskah_Metodologi_v1.pdf', null, 120),
    mkFile(b1.id, author2.id, 2, 'REVISION_REVIEW', 'Naskah_Metodologi_v2.pdf', 'Perbaikan Bab 3 sesuai catatan reviewer', 95),
    mkFile(b1.id, editor.id, 3, 'FINAL_PUBLISHED', 'Final_Metodologi_ISBN.pdf', 'Berkas final ber-ISBN', 30),
  ]);
  await db('review_logs').insert([
    { book_id: b1.id, reviewer_user_id: reviewer.id, role_type: 'REVIEWER', decision: 'REQUEST_REVISION', notes: 'Bab 3 perlu penajaman pada bagian teknik sampling.', created_at: db.raw(`NOW() - INTERVAL '100 days'`) },
    { book_id: b1.id, reviewer_user_id: reviewer.id, role_type: 'REVIEWER', decision: 'APPROVED', notes: 'Revisi telah memadai. Naskah layak lanjut ke tahap editorial.', created_at: db.raw(`NOW() - INTERVAL '90 days'`) },
    { book_id: b1.id, reviewer_user_id: editor.id, role_type: 'EDITOR', decision: 'APPROVED', notes: 'Tata bahasa dan layout telah sesuai pedoman LPPM Press.', created_at: db.raw(`NOW() - INTERVAL '60 days'`) },
  ]);

  const [b2] = await db('books').insert({
    author_id: author3.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Hukum Pertanahan dan Bela Negara: Perspektif Kontemporer',
    abstract: 'Karya ini mengkaji irisan antara regulasi pertanahan nasional dengan semangat bela negara, mencakup analisis UUPA, konflik agraria, serta peran sivitas akademika dalam penguatan wawasan kebangsaan.',
    category: 'Hukum', status: 'COMPLETED', isbn: '978-602-44125-2-4',
    final_book_url: 'seed/final-pertanahan.pdf',
    created_at: db.raw(`NOW() - INTERVAL '200 days'`),
  }).returning('*');
  writeSeedPdf('seed/final-pertanahan.pdf');
  await db('book_files').insert([
    mkFile(b2.id, author3.id, 1, 'INITIAL', 'Naskah_Pertanahan_v1.pdf', null, 200),
    mkFile(b2.id, editor.id, 2, 'FINAL_PUBLISHED', 'Final_Pertanahan_ISBN.pdf', 'Berkas final ber-ISBN', 150),
  ]);

  const [b3] = await db('books').insert({
    author_id: author1.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Pengantar Teknik Informatika dan Kecerdasan Buatan',
    abstract: 'Buku pengantar yang membekali mahasiswa dengan fondasi ilmu komputer, pemrograman, struktur data, serta pengantar machine learning dan penerapannya pada permasalahan nyata di Indonesia.',
    category: 'Teknik Informatika', status: 'COMPLETED', isbn: '978-602-44125-3-1',
    final_book_url: 'seed/final-informatika.pdf',
    created_at: db.raw(`NOW() - INTERVAL '80 days'`),
  }).returning('*');
  writeSeedPdf('seed/final-informatika.pdf');
  await db('book_files').insert([
    mkFile(b3.id, author1.id, 1, 'INITIAL', 'Naskah_Informatika_v1.pdf', null, 80),
    mkFile(b3.id, editor.id, 2, 'FINAL_PUBLISHED', 'Final_Informatika_ISBN.pdf', 'Berkas final ber-ISBN', 40),
  ]);

  // ---- 2. GETTING_ISBN (pembayaran terverifikasi) ----
  const [b4] = await db('books').insert({
    author_id: author1.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Sistem Irigasi Berkelanjutan untuk Lahan Rawa',
    abstract: 'Membahas rekayasa sistem irigasi ramah lingkungan pada lahan rawa pasang surut, meliputi hidrologi, konstruksi pintu air, dan model tata kelola air partisipatif bersama petani.',
    category: 'Teknik Sipil', status: 'GETTING_ISBN',
    review_approved_at: db.raw(`NOW() - INTERVAL '20 days'`),
    editorial_approved_at: db.raw(`NOW() - INTERVAL '10 days'`),
    created_at: db.raw(`NOW() - INTERVAL '70 days'`),
  }).returning('*');
  await db('book_files').insert([
    mkFile(b4.id, author1.id, 1, 'INITIAL', 'Naskah_Irigasi_v1.pdf', null, 70),
    mkFile(b4.id, author1.id, 2, 'REVISION_EDIT', 'Naskah_Irigasi_v2.pdf', 'Perbaikan format tabel dan referensi', 12),
  ]);
  await db('payments').insert({
    book_id: b4.id, author_id: author1.id, amount: 1500000,
    proof_url: 'seed/bukti-bayar-irigasi.pdf', status: 'VERIFIED',
    verified_by: lppm.id, verified_at: db.raw(`NOW() - INTERVAL '3 days'`),
  });
  writeSeedPdf('seed/bukti-bayar-irigasi.pdf');

  // ---- 3. PAYMENT_REQUIRED (bukti bayar PENDING) ----
  const [b5] = await db('books').insert({
    author_id: author2.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Manajemen Strategis UMKM di Era Digital',
    abstract: 'Kajian praktis mengenai transformasi digital UMKM Indonesia: strategi pemasaran digital, pengelolaan keuangan sederhana, dan pemanfaatan platform e-commerce untuk peningkatan daya saing.',
    category: 'Ekonomi dan Bisnis', status: 'PAYMENT_REQUIRED',
    review_approved_at: db.raw(`NOW() - INTERVAL '15 days'`),
    editorial_approved_at: db.raw(`NOW() - INTERVAL '5 days'`),
    created_at: db.raw(`NOW() - INTERVAL '60 days'`),
  }).returning('*');
  await db('book_files').insert([mkFile(b5.id, author2.id, 1, 'INITIAL', 'Naskah_UMKM_v1.pdf', null, 60)]);
  await db('payments').insert({
    book_id: b5.id, author_id: author2.id, amount: 1500000,
    proof_url: 'seed/bukti-bayar-umkm.pdf', status: 'PENDING',
  });
  writeSeedPdf('seed/bukti-bayar-umkm.pdf');

  // ---- 4. IN_EDIT ----
  const [b6] = await db('books').insert({
    author_id: author3.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Kriminologi dan Sistem Peradilan Pidana di Indonesia',
    abstract: 'Analisis teori kriminologi klasik hingga modern serta evaluasi kritis terhadap sistem peradilan pidana terpadu di Indonesia, disertai studi kasus penanganan kejahatan transnasional.',
    category: 'Hukum', status: 'IN_EDIT',
    review_approved_at: db.raw(`NOW() - INTERVAL '6 days'`),
    created_at: db.raw(`NOW() - INTERVAL '45 days'`),
  }).returning('*');
  await db('book_files').insert([
    mkFile(b6.id, author3.id, 1, 'INITIAL', 'Naskah_Kriminologi_v1.pdf', null, 45),
    mkFile(b6.id, author3.id, 2, 'REVISION_REVIEW', 'Naskah_Kriminologi_v2.pdf', 'Penambahan studi kasus Bab 5', 10),
  ]);
  await db('review_logs').insert([
    { book_id: b6.id, reviewer_user_id: reviewer.id, role_type: 'REVIEWER', decision: 'REQUEST_REVISION', notes: 'Mohon tambahkan studi kasus empiris pada Bab 5.', created_at: db.raw(`NOW() - INTERVAL '12 days'`) },
    { book_id: b6.id, reviewer_user_id: reviewer.id, role_type: 'REVIEWER', decision: 'APPROVED', notes: 'Substansi telah memenuhi kelayakan akademik.', created_at: db.raw(`NOW() - INTERVAL '6 days'`) },
  ]);

  // ---- 5. REVISION_EDIT ----
  const [b7] = await db('books').insert({
    author_id: author1.id, reviewer_id: reviewer.id, editor_id: editor.id,
    title: 'Struktur Beton Bertulang: Teori dan Aplikasi',
    abstract: 'Buku ajar teknik sipil yang mengupas perencanaan elemen beton bertulang berdasarkan SNI 2847, dilengkapi contoh perhitungan balok, kolom, dan pelat serta soal latihan.',
    category: 'Teknik Sipil', status: 'REVISION_EDIT',
    review_approved_at: db.raw(`NOW() - INTERVAL '14 days'`),
    created_at: db.raw(`NOW() - INTERVAL '50 days'`),
  }).returning('*');
  await db('book_files').insert([
    mkFile(b7.id, author1.id, 1, 'INITIAL', 'Naskah_Beton_v1.pdf', null, 50),
    mkFile(b7.id, author1.id, 2, 'REVISION_REVIEW', 'Naskah_Beton_v2.pdf', 'Revisi substansi Bab 4', 20),
  ]);
  await db('review_logs').insert([
    { book_id: b7.id, reviewer_user_id: editor.id, role_type: 'EDITOR', decision: 'REQUEST_REVISION', notes: 'Format tabel belum konsisten; referensi mohon mengikuti gaya APA edisi 7.', created_at: db.raw(`NOW() - INTERVAL '2 days'`) },
  ]);

  // ---- 6. IN_REVIEW ----
  const [b8] = await db('books').insert({
    author_id: author2.id, reviewer_id: reviewer.id,
    title: 'Akuntansi Keuangan Berbasis SAK untuk Entitas Syariah',
    abstract: 'Pembahasan pencatatan dan pelaporan transaksi syariah berdasarkan PSAK 101-109, dengan ilustrasi jurnal mudharabah, musyarakah, dan murabahah pada lembaga keuangan syariah.',
    category: 'Ekonomi dan Bisnis', status: 'IN_REVIEW',
    created_at: db.raw(`NOW() - INTERVAL '15 days'`),
  }).returning('*');
  await db('book_files').insert([mkFile(b8.id, author2.id, 1, 'INITIAL', 'Naskah_Akuntansi_v1.pdf', null, 15)]);

  // ---- 7. REVISION_REVIEW ----
  const [b9] = await db('books').insert({
    author_id: author3.id, reviewer_id: reviewer.id,
    title: 'Hukum Acara Perdata: Praktik Beracara di Pengadilan',
    abstract: 'Panduan praktis beracara perdata mulai dari pendaftaran gugatan, pembuktian, hingga eksekusi putusan, dilengkapi contoh dokumen persidangan dan analisis jurisprudensi terkini.',
    category: 'Hukum', status: 'REVISION_REVIEW',
    created_at: db.raw(`NOW() - INTERVAL '25 days'`),
  }).returning('*');
  await db('book_files').insert([mkFile(b9.id, author3.id, 1, 'INITIAL', 'Naskah_AcaraPerdata_v1.pdf', null, 25)]);
  await db('review_logs').insert([
    { book_id: b9.id, reviewer_user_id: reviewer.id, role_type: 'REVIEWER', decision: 'REQUEST_REVISION', notes: 'Bab pembuktian perlu diperdalam dengan rujukan HIR/RBg terbaru.', created_at: db.raw(`NOW() - INTERVAL '3 days'`) },
  ]);

  // ---- 8. SUBMITTED ----
  const [b10] = await db('books').insert({
    author_id: author1.id,
    title: 'Energi Terbarukan untuk Ketahanan Nasional',
    abstract: 'Kajian potensi energi surya, angin, dan biomassa di Indonesia dalam kerangka ketahanan energi nasional, mencakup analisis kebijakan, kesiapan teknologi, dan roadmap implementasi.',
    category: 'Teknik Elektro', status: 'SUBMITTED',
    created_at: db.raw(`NOW() - INTERVAL '2 days'`),
  }).returning('*');
  await db('book_files').insert([mkFile(b10.id, author1.id, 1, 'INITIAL', 'Naskah_Energi_v1.pdf', null, 2)]);

  console.log('Seed selesai. Akun demo (password: Password123!):');
  console.log('  LPPM     : lppm@upnvj.ac.id');
  console.log('  Reviewer : reviewer@upnvj.ac.id');
  console.log('  Editor   : editor@upnvj.ac.id');
  console.log('  Author   : author@upnvj.ac.id / author2@upnvj.ac.id / author3@upnvj.ac.id');
  await db.destroy();
}

seed().catch((e) => {
  console.error('Seed gagal:', e.message);
  process.exit(1);
});
