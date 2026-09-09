'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api, formatDate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Book } from '@/lib/types';
import { EmptyState, ErrorState, LoadingState, PageHeader, PrimaryButton, StatusBadge } from '@/lib/ui';

export default function PengajuanPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBooks(await api.get<Book[]>('/books/my', token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat pengajuan');
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardShell>
      <PageHeader title="Pengajuan Naskah" description="Kelola seluruh naskah buku yang Anda ajukan ke LPPM Press.">
        <Link href="/pengajuan/tambah">
          <PrimaryButton><Plus className="h-4 w-4" strokeWidth={1.75} /> Ajukan Naskah Baru</PrimaryButton>
        </Link>
      </PageHeader>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !books ? (
        <LoadingState />
      ) : books.length === 0 ? (
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
              {books.map((b) => (
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
    </DashboardShell>
  );
}
