'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { api, formatDate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Book, PaginatedBooks, STATUS_LABEL } from '@/lib/types';
import { EmptyState, ErrorState, inputClass, LoadingState, PageHeader, PrimaryButton, StatusBadge } from '@/lib/ui';

export default function PengajuanPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<PaginatedBooks | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      setBooks(await api.get<PaginatedBooks>(`/books/my?${params.toString()}`, token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat pengajuan');
    }
  }, [token, search, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <DashboardShell>
      <PageHeader title="Pengajuan Naskah" description="Kelola seluruh naskah buku yang Anda ajukan ke LPPM Press.">
        <Link href="/pengajuan/tambah">
          <PrimaryButton><Plus className="h-4 w-4" strokeWidth={1.75} /> Ajukan Naskah Baru</PrimaryButton>
        </Link>
      </PageHeader>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari judul naskah..." className={`${inputClass} !pl-9`} />
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
        <EmptyState
          title="Belum ada pengajuan"
          description="Mulai perjalanan penerbitan buku Anda dengan mengajukan naskah pertama."
          action={<Link href="/pengajuan/tambah"><PrimaryButton><Plus className="h-4 w-4" strokeWidth={1.75} /> Ajukan Naskah</PrimaryButton></Link>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Judul Naskah</th>
                <th className="px-5 py-3 font-medium">Kategori</th>
                <th className="px-5 py-3 font-medium">Versi</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {books.items.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3.5">
                    <Link href={`/pengajuan/${b.id}`} className="font-medium text-zinc-900 underline-offset-2 hover:text-[#1E6F3D] hover:underline dark:text-zinc-100">
                      {b.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">{b.category}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">v{b.current_version ?? 1}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDate(b.created_at)}</td>
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
    </DashboardShell>
  );
}
