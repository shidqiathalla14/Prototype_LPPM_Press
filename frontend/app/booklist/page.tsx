'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ClipboardCheck, Download, Search } from 'lucide-react';
import { api, downloadFile, formatDate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Book, PaginatedBooks, STATUS_LABEL } from '@/lib/types';
import { EmptyState, ErrorState, Field, GhostButton, inputClass, LoadingState, Modal, PageHeader, PrimaryButton, StatusBadge, Toast } from '@/lib/ui';

export default function BooklistPage() {
  const { token, role } = useAuth();
  const [books, setBooks] = useState<PaginatedBooks | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Book | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REQUEST_REVISION'>('APPROVED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const activeStatus = role === 'REVIEWER' ? 'IN_REVIEW' : 'IN_EDIT';

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      setBooks(await api.get<PaginatedBooks>(`/books/assigned?${params.toString()}`, token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat booklist');
    }
  }, [token, search, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  const submitEvaluation = async () => {
    if (!target || !token) return;
    if (notes.trim().length < 10) {
      setToast({ kind: 'error', message: 'Catatan evaluasi minimal 10 karakter' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/books/${target.id}/evaluate`, { decision, notes: notes.trim() }, token);
      setToast({ kind: 'success', message: decision === 'APPROVED' ? 'Tahapan disetujui' : 'Permintaan revisi dikirim ke penulis' });
      setTarget(null); setNotes(''); setDecision('APPROVED');
      await load();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Gagal mengirim evaluasi' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Booklist Naskah"
        description="Seluruh naskah untuk dibaca; evaluasi hanya tersedia untuk naskah yang ditugaskan kepada Anda."
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari judul atau penulis..." className={`${inputClass} !pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${inputClass} sm:w-56`}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !books ? (
        <LoadingState />
      ) : books.items.length === 0 ? (
        <EmptyState title="Belum ada naskah" description="Naskah yang masuk ke sistem akan muncul di sini." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Judul & Penulis</th>
                <th className="px-5 py-3 font-medium">Versi</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Diperbarui</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {books.items.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3.5">
                    <Link href={`/booklist/${b.id}`} className="font-medium text-zinc-900 underline-offset-2 hover:text-[#1E6F3D] hover:underline dark:text-zinc-100">
                      {b.title}
                    </Link>
                    <p className="text-xs text-zinc-400">{b.author_name}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">v{b.current_version ?? 1}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDate(b.updated_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {b.status === activeStatus ? (
                      <button
                        onClick={() => setTarget(b)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E6F3D] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#143823] dark:bg-[#238636]"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> Evaluasi
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">Menunggu tahap lain</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {books && books.items.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span>{books.total} naskah · Halaman {books.page} dari {books.totalPages}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Halaman sebelumnya" title="Halaman sebelumnya" disabled={books.page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40 dark:border-zinc-800"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" aria-label="Halaman berikutnya" title="Halaman berikutnya" disabled={books.page >= books.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40 dark:border-zinc-800"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title={`Evaluasi: ${target?.title ?? ''}`}>
        <div className="space-y-4">
          <Field label="Keputusan">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${decision === 'APPROVED' ? 'border-[#1E6F3D] bg-[#EAF5EE] text-[#143823] dark:bg-[#143823]/60 dark:text-[#EAF5EE]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400'}`}
              >
                Setujui Tahapan
              </button>
              <button
                type="button"
                onClick={() => setDecision('REQUEST_REVISION')}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${decision === 'REQUEST_REVISION' ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400'}`}
              >
                Minta Revisi
              </button>
            </div>
          </Field>
          <Field label="Catatan Evaluasi" hint="Catatan ini dikirim ke penulis melalui email dan tercatat permanen.">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={inputClass} placeholder="Tuliskan hasil telaah / catatan penyuntingan..." />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setTarget(null)}>Batal</GhostButton>
            <PrimaryButton disabled={submitting} onClick={() => void submitEvaluation()}>
              {submitting ? 'Mengirim...' : 'Kirim Evaluasi'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
    </DashboardShell>
  );
}
