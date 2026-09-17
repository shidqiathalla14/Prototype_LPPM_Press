'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ChevronLeft, ChevronRight, Search, UserPlus2 } from 'lucide-react';
import { api, formatDate, formatRupiah } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Book, BookStatus, PaginatedBooks, Payment, STATUS_LABEL } from '@/lib/types';
import { EmptyState, ErrorState, Field, GhostButton, inputClass, LoadingState, Modal, PageHeader, PrimaryButton, StatusBadge, Toast } from '@/lib/ui';

interface RoleUser { id: string; full_name: string; email: string; faculty: string | null }

export default function ManajemenBukuPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<PaginatedBooks | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const [assignTarget, setAssignTarget] = useState<Book | null>(null);
  const [assignKind, setAssignKind] = useState<'reviewer' | 'editor'>('reviewer');
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [payTarget, setPayTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isbnTarget, setIsbnTarget] = useState<Book | null>(null);
  const [isbn, setIsbn] = useState('');
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('page', String(page));
      params.set('pageSize', '10');
      const [b, p] = await Promise.all([
        api.get<PaginatedBooks>(`/books?${params.toString()}`, token),
        api.get<Payment[]>('/payments', token),
      ]);
      setBooks(b); setPayments(p); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    }
  }, [token, search, statusFilter, categoryFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAssign = async (book: Book, kind: 'reviewer' | 'editor') => {
    setAssignTarget(book); setAssignKind(kind); setSelectedUser('');
    if (token) {
      const users = await api.get<RoleUser[]>(`/users/by-role/${kind.toUpperCase()}`, token);
      setRoleUsers(users);
    }
  };

  const submitAssign = async () => {
    if (!token || !assignTarget || !selectedUser) return;
    setSubmitting(true);
    try {
      await api.patch(`/books/${assignTarget.id}/assign`, { [`${assignKind}_id`]: selectedUser }, token);
      setToast({ kind: 'success', message: 'Penugasan berhasil disimpan & notifikasi email dikirim' });
      setAssignTarget(null);
      await load();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Penugasan gagal' });
    } finally { setSubmitting(false); }
  };

  const submitVerify = async (approved: boolean) => {
    if (!token || !payTarget) return;
    if (!approved && rejectReason.trim().length < 5) {
      setToast({ kind: 'error', message: 'Alasan penolakan wajib diisi' });
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/payments/${payTarget.id}/verify`, approved ? { is_approved: true } : { is_approved: false, rejection_reason: rejectReason.trim() }, token);
      setToast({ kind: 'success', message: approved ? 'Pembayaran diverifikasi. Naskah masuk antre ISBN' : 'Pembayaran ditolak' });
      setPayTarget(null); setRejectReason('');
      await load();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Verifikasi gagal' });
    } finally { setSubmitting(false); }
  };

  const submitPublish = async () => {
    if (!token || !isbnTarget) return;
    if (!/^97[89][\d-]{8,20}$/.test(isbn)) {
      setToast({ kind: 'error', message: 'Format ISBN-13 tidak valid (contoh: 978-602-44125-1-7)' });
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('isbn', isbn);
      if (finalFile) form.append('file', finalFile);
      await api.patchForm(`/books/${isbnTarget.id}/publish`, form, token);
      setToast({ kind: 'success', message: 'Buku resmi diterbitkan dan tampil di katalog publik' });
      setIsbnTarget(null); setIsbn(''); setFinalFile(null);
      await load();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Penerbitan gagal' });
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardShell>
      <PageHeader title="Manajemen Buku" description="Master data seluruh naskah: penugasan, verifikasi pembayaran, dan penerbitan ISBN." />

      {/* Antrean verifikasi pembayaran */}
      {payments.filter((p) => p.status === 'PENDING').length > 0 && (
        <section className="mb-6 rounded-xl border border-orange-200 bg-white shadow-subtle dark:border-orange-900 dark:bg-zinc-900">
          <h2 className="border-b border-zinc-100 px-5 py-3.5 text-sm font-semibold text-zinc-950 dark:border-zinc-800 dark:text-zinc-50">
            Pembayaran Menunggu Verifikasi
          </h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.filter((p) => p.status === 'PENDING').map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{p.book_title}</p>
                  <p className="text-[11px] text-zinc-400">{p.author_name} · {formatRupiah(p.amount)} · {formatDate(p.created_at)}</p>
                </div>
                <PrimaryButton onClick={() => setPayTarget(p)} className="!px-3 !py-1.5 !text-xs">
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> Verifikasi
                </PrimaryButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari judul atau penulis..." className={`${inputClass} !pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${inputClass} sm:w-56`}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className={`${inputClass} sm:w-56`}>
          <option value="">Semua Kategori</option>
          {(books?.categories || []).map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !books ? (
        <LoadingState />
      ) : books.items.length === 0 ? (
        <EmptyState title="Tidak ada naskah" description="Belum ada naskah yang cocok dengan filter saat ini." />
      ) : (
        <>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Judul & Penulis</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Reviewer / Editor</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {books.items.map((b) => {
                const locked = ['PAYMENT_REQUIRED', 'PAYMENT_VERIFIED', 'GETTING_ISBN', 'COMPLETED'].includes(b.status);
                return (
                  <tr key={b.id} className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                    <td className="px-5 py-3.5">
                      <Link href={`/manajemen-buku/${b.id}`} className="font-medium text-zinc-900 underline-offset-2 hover:text-[#1E6F3D] hover:underline dark:text-zinc-100">
                        {b.title}
                      </Link>
                      <p className="text-xs text-zinc-400">{b.author_name} · {b.category}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status as BookStatus} /></td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="inline-flex min-h-6 items-center rounded-full border border-zinc-200 px-2.5 py-0.5 dark:border-zinc-700">R: {b.reviewer_name || 'Belum ditugaskan'}</span>
                        <span className="inline-flex min-h-6 items-center rounded-full border border-zinc-200 px-2.5 py-0.5 dark:border-zinc-700">E: {b.editor_name || 'Belum ditugaskan'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDate(b.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {b.status === 'GETTING_ISBN' && (
                          <button onClick={() => setIsbnTarget(b)} className="rounded-lg bg-[#1E6F3D] px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#143823] dark:bg-[#238636]">
                            Rilis ISBN
                          </button>
                        )}
                        {!locked && (
                          <>
                            <button onClick={() => void openAssign(b, 'reviewer')} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                              <UserPlus2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Reviewer
                            </button>
                            <button onClick={() => void openAssign(b, 'editor')} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                              <UserPlus2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Editor
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Menampilkan {((books.page - 1) * books.pageSize) + 1}-{Math.min(books.page * books.pageSize, books.total)} dari {books.total} naskah</span>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label="Halaman sebelumnya"
              title="Halaman sebelumnya"
              disabled={books.page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <span>Halaman {books.page} dari {books.totalPages}</span>
            <button
              type="button"
              aria-label="Halaman berikutnya"
              title="Halaman berikutnya"
              disabled={books.page >= books.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        </>
      )}

      {/* Modal penugasan */}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Tugaskan ${assignKind === 'reviewer' ? 'Reviewer' : 'Editor'}`}>
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Naskah: <strong className="text-zinc-800 dark:text-zinc-200">{assignTarget?.title}</strong></p>
          <Field label={`Pilih ${assignKind === 'reviewer' ? 'Reviewer' : 'Editor'}`}>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className={inputClass}>
              <option value="">Pilih</option>
              {roleUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.faculty || u.email})</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setAssignTarget(null)}>Batal</GhostButton>
            <PrimaryButton disabled={!selectedUser || submitting} onClick={() => void submitAssign()}>
              {submitting ? 'Menyimpan...' : 'Simpan Penugasan'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Modal verifikasi pembayaran */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Verifikasi Pembayaran">
        <div className="space-y-4">
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between"><dt className="text-zinc-400">Naskah</dt><dd className="max-w-[60%] text-right font-medium text-zinc-900 dark:text-zinc-100">{payTarget?.book_title}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-400">Penulis</dt><dd className="font-medium text-zinc-900 dark:text-zinc-100">{payTarget?.author_name}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-400">Nominal</dt><dd className="font-semibold text-zinc-900 dark:text-zinc-100">{payTarget ? formatRupiah(payTarget.amount) : ''}</dd></div>
          </dl>
          <a
            href={payTarget ? `/api/proof-proxy/${payTarget.id}` : '#'}
            onClick={async (e) => {
              e.preventDefault();
              if (!payTarget || !token) return;
              const { downloadFile } = await import('@/lib/api');
              await downloadFile(`/payments/${payTarget.id}/proof`, token, 'bukti-pembayaran');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6F3D] hover:underline dark:text-[#238636]"
          >
            Lihat / unduh bukti transfer
          </a>
          <Field label="Alasan Penolakan (wajib jika menolak)">
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} className={inputClass} placeholder="Contoh: nominal tidak sesuai tagihan..." />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={() => void submitVerify(false)} disabled={submitting} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">
              Tolak
            </button>
            <PrimaryButton disabled={submitting} onClick={() => void submitVerify(true)}>
              {submitting ? 'Memproses...' : 'Setujui Pembayaran'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Modal rilis ISBN */}
      <Modal open={!!isbnTarget} onClose={() => setIsbnTarget(null)} title="Rilis ISBN & Terbitkan Buku">
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Naskah: <strong className="text-zinc-800 dark:text-zinc-200">{isbnTarget?.title}</strong></p>
          <Field label="Nomor ISBN Resmi" hint="Format ISBN-13 dari Perpustakaan Nasional RI.">
            <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className={`${inputClass} font-mono`} placeholder="978-602-xxxxx-x-x" />
          </Field>
          <Field label="Berkas e-Book Final (opsional, PDF/DOCX)">
            <input type="file" accept=".pdf,.docx,.doc" onChange={(e) => setFinalFile(e.target.files?.[0] || null)} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setIsbnTarget(null)}>Batal</GhostButton>
            <PrimaryButton disabled={submitting} onClick={() => void submitPublish()}>
              {submitting ? 'Menerbitkan...' : 'Terbitkan (COMPLETED)'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
    </DashboardShell>
  );
}
