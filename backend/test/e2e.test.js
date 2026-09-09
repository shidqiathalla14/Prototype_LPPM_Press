/**
 * Uji integrasi API — dijalankan terhadap server yang sedang berjalan.
 * Prasyarat: DB bermigrasi + ter-seed, server aktif di PORT (default 4000).
 * Jalankan: npm test
 * Memakai FormData/Blob bawaan Node 18+ (tanpa dependensi tambahan).
 */
const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const BASE = `http://localhost:${process.env.PORT || 4000}/api/v1`;

async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form; // fetch mengatur boundary multipart secara otomatis
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${url}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* file download dsb. */ }
  return { status: res.status, json };
}

function pdfForm(fields) {
  const pdf = path.join(__dirname, 'sample.pdf');
  if (!fs.existsSync(pdf)) {
    fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  }
  const form = new FormData();
  for (const [k, v] of Object.entries(fields || {})) form.append(k, v);
  return { form, pdfBlob: () => new Blob([fs.readFileSync(pdf)], { type: 'application/pdf' }) };
}

async function login(email, password = 'Password123!') {
  const r = await api('POST', '/auth/login', { body: { email, password } });
  assert.strictEqual(r.status, 200, `login ${email} gagal`);
  return r.json.access_token;
}

let tokens = {};

before(async () => {
  tokens.lppm = await login('lppm@upnvj.ac.id');
  tokens.reviewer = await login('reviewer@upnvj.ac.id');
  tokens.editor = await login('editor@upnvj.ac.id');
  tokens.author = await login('author@upnvj.ac.id');
});

test('AUTH: login salah ditolak 401', async () => {
  const r = await api('POST', '/auth/login', { body: { email: 'author@upnvj.ac.id', password: 'salah' } });
  assert.strictEqual(r.status, 401);
});

test('AUTH: register author baru berhasil', async () => {
  const email = `test${Date.now()}@upnvj.ac.id`;
  const r = await api('POST', '/auth/register', {
    body: { email, password: 'Password123!', full_name: 'Penulis Uji Coba', identifier_number: '12345' },
  });
  assert.strictEqual(r.status, 201);
});

test('RBAC: author ditolak 403 saat akses /books/assigned', async () => {
  const r = await api('GET', '/books/assigned', { token: tokens.author });
  assert.strictEqual(r.status, 403);
});

test('RBAC: reviewer ditolak 403 saat akses manajemen /books', async () => {
  const r = await api('GET', '/books', { token: tokens.reviewer });
  assert.strictEqual(r.status, 403);
});

test('RBAC: tanpa token ditolak 401', async () => {
  const r = await api('GET', '/books/my');
  assert.strictEqual(r.status, 401);
});

test('PUBLIK: katalog hanya menampilkan buku COMPLETED', async () => {
  const r = await api('GET', '/books/public-catalog');
  assert.strictEqual(r.status, 200);
  assert.ok(r.json.items.length >= 3);
  assert.ok(r.json.items.every((b) => b.isbn));
});

test('WORKFLOW: perjalanan lengkap submit → review → edit → bayar → ISBN → terbit', async () => {
  // 1. Submit
  const f1 = pdfForm({
    title: 'Buku Uji Workflow Otomatis LPPM Press',
    abstract: 'Abstrak uji otomatis yang memastikan seluruh alur state machine berjalan dari pengajuan hingga penerbitan ISBN resmi tanpa intervensi manual.',
    category: 'Pengujian Sistem',
  });
  f1.form.append('file', f1.pdfBlob(), 'naskah-uji-v1.pdf');
  let r = await api('POST', '/books', { token: tokens.author, form: f1.form });
  assert.strictEqual(r.status, 201, JSON.stringify(r.json));
  const bookId = r.json.id;
  assert.strictEqual(r.json.status, 'SUBMITTED');

  // 2. LPPM assign reviewer → IN_REVIEW
  const reviewers = (await api('GET', '/users/by-role/REVIEWER', { token: tokens.lppm })).json;
  const editors = (await api('GET', '/users/by-role/EDITOR', { token: tokens.lppm })).json;
  r = await api('PATCH', `/books/${bookId}/assign`, { token: tokens.lppm, body: { reviewer_id: reviewers[0].id } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.status, 'IN_REVIEW');

  // 3. Reviewer minta revisi → REVISION_REVIEW
  r = await api('POST', `/books/${bookId}/evaluate`, { token: tokens.reviewer, body: { decision: 'REQUEST_REVISION', notes: 'Mohon perbaiki Bab 2 secara menyeluruh.' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.status, 'REVISION_REVIEW');

  // 4. Author unggah revisi v2 → IN_REVIEW, versi naik, v1 utuh
  const f2 = pdfForm({ notes: 'Revisi Bab 2 selesai' });
  f2.form.append('file', f2.pdfBlob(), 'naskah-uji-v2.pdf');
  r = await api('POST', `/books/${bookId}/revisions`, { token: tokens.author, form: f2.form });
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  assert.strictEqual(r.json.version, 2);
  assert.strictEqual(r.json.status, 'IN_REVIEW');

  const detail1 = (await api('GET', `/books/${bookId}`, { token: tokens.author })).json;
  assert.strictEqual(detail1.files.length, 2, 'v1 harus tetap tersimpan');

  // 5. Reviewer approve
  r = await api('POST', `/books/${bookId}/evaluate`, { token: tokens.reviewer, body: { decision: 'APPROVED', notes: 'Substansi memadai untuk lanjut.' } });
  assert.strictEqual(r.status, 200);

  // 6. LPPM assign editor → IN_EDIT
  r = await api('PATCH', `/books/${bookId}/assign`, { token: tokens.lppm, body: { editor_id: editors[0].id } });
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  assert.strictEqual(r.json.status, 'IN_EDIT');

  // 7. Editor approve → PAYMENT_REQUIRED (payment lock aktif)
  r = await api('POST', `/books/${bookId}/evaluate`, { token: tokens.editor, body: { decision: 'APPROVED', notes: 'Tata bahasa dan layout sesuai pedoman.' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.status, 'PAYMENT_REQUIRED');

  // 8. PAYMENT LOCK: upload revisi harus DITOLAK
  const f3 = pdfForm({});
  f3.form.append('file', f3.pdfBlob(), 'naskah-uji-terkunci.pdf');
  r = await api('POST', `/books/${bookId}/revisions`, { token: tokens.author, form: f3.form });
  assert.strictEqual(r.status, 403, 'Payment lock harus menolak perubahan berkas');

  // 9. Author unggah bukti bayar
  const f4 = pdfForm({ amount: '1500000' });
  f4.form.append('proof_file', f4.pdfBlob(), 'bukti-bayar.pdf');
  r = await api('POST', `/payments/${bookId}`, { token: tokens.author, form: f4.form });
  assert.strictEqual(r.status, 201, JSON.stringify(r.json));
  const paymentId = r.json.id;

  // 10. LPPM verifikasi → GETTING_ISBN
  r = await api('PATCH', `/payments/${paymentId}/verify`, { token: tokens.lppm, body: { is_approved: true } });
  assert.strictEqual(r.status, 200);
  const afterVerify = (await api('GET', `/books/${bookId}`, { token: tokens.lppm })).json;
  assert.strictEqual(afterVerify.status, 'GETTING_ISBN');

  // 11. LPPM input ISBN → COMPLETED
  r = await api('PATCH', `/books/${bookId}/publish`, { token: tokens.lppm, body: { isbn: '978-602-44125-9-3' } });
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  assert.strictEqual(r.json.status, 'COMPLETED');

  // 12. Muncul di katalog publik
  const catalog = (await api('GET', '/books/public-catalog?search=Uji Workflow')).json;
  assert.ok(catalog.items.some((b) => b.id === bookId), 'Buku terbit harus tampil di katalog');
});

test('IMPERSONASI: sesi LPPM utuh, view berubah, kembali normal', async () => {
  let r = await api('POST', '/auth/impersonate', { token: tokens.lppm, body: { target_role: 'REVIEWER' } });
  assert.strictEqual(r.status, 200);
  const imp = r.json.impersonation_token;

  // Token impersonasi tidak boleh akses fitur LPPM
  r = await api('GET', '/books', { token: imp });
  assert.strictEqual(r.status, 403);

  // Non-LPPM tidak boleh impersonasi
  r = await api('POST', '/auth/impersonate', { token: tokens.author, body: { target_role: 'EDITOR' } });
  assert.strictEqual(r.status, 403);

  // Kembali ke mode LPPM
  r = await api('POST', '/auth/stop-impersonation', { token: imp });
  assert.strictEqual(r.status, 200);
  const restored = r.json.access_token;
  r = await api('GET', '/books', { token: restored });
  assert.strictEqual(r.status, 200);
});

test('BUG REPORT: pengguna dapat melaporkan kendala, LPPM dapat melihat', async () => {
  let r = await api('POST', '/settings/bug-report', { token: tokens.author, body: { subject: 'Uji laporan', description: 'Deskripsi kendala uji otomatis.' } });
  assert.strictEqual(r.status, 201);
  r = await api('GET', '/settings/bug-reports', { token: tokens.lppm });
  assert.strictEqual(r.status, 200);
  assert.ok(r.json.length > 0);
});
