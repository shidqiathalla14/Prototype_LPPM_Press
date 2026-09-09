'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Library, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { LoadingState, PageHeader } from '@/lib/ui';

type Stats = Record<string, number>;

export default function DashboardPage() {
  const { token, role, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) return;
    void api.get<Stats>('/users/me/stats', token).then(setStats).catch(() => setStats({}));
  }, [token]);

  return (
    <DashboardShell>
      <PageHeader title={`Selamat datang, ${user?.full_name ?? ''}`} description="Ringkasan aktivitas penerbitan Anda di LPPM Press UPNVJ." />
      {!stats || !role ? (
        <LoadingState label="Memuat ringkasan..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {role === 'AUTHOR' && (
              <>
                <StatCard icon={BookOpen} label="Total Buku Diajukan" value={stats.total} />
                <StatCard icon={Clock} label="Naskah Dalam Proses" value={stats.inProgress} />
                <StatCard icon={Library} label="Buku Selesai Terbit" value={stats.completed} />
              </>
            )}
            {(role === 'REVIEWER' || role === 'EDITOR') && (
              <>
                <StatCard icon={Clock} label="Antrean Tugas Berjalan" value={stats.queue} />
                <StatCard icon={Library} label="Tugas Selesai Ditinjau" value={stats.done} />
                <StatCard icon={BookOpen} label="Total Penugasan" value={stats.total} />
              </>
            )}
            {role === 'LPPM' && (
              <>
                <StatCard icon={BookOpen} label="Total Naskah Masuk" value={stats.total} />
                <StatCard icon={Wallet} label="Pembayaran Menunggu Verifikasi" value={stats.paymentPending} />
                <StatCard icon={Library} label="Antre ISBN / Terbit" value={(stats.gettingIsbn ?? 0) + (stats.completed ?? 0)} />
              </>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Aksi Cepat</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {role === 'AUTHOR' && (
                <QuickLink href="/pengajuan/tambah" label="Ajukan Naskah Baru" />
              )}
              {role === 'AUTHOR' && <QuickLink href="/pengajuan" label="Lihat Pengajuan Saya" />}
              {(role === 'REVIEWER' || role === 'EDITOR') && <QuickLink href="/booklist" label="Buka Booklist Tugas" />}
              {role === 'LPPM' && <QuickLink href="/manajemen-buku" label="Kelola Seluruh Naskah" />}
              <QuickLink href="/profile" label="Profil & Kontribusi" />
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <Icon className="h-4 w-4 text-[#1E6F3D] dark:text-[#238636]" strokeWidth={1.75} />
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">{value ?? 0}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-800 shadow-subtle transition-all hover:border-[#1E6F3D]/50 hover:text-[#1E6F3D] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-[#238636]">
      {label} <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
    </Link>
  );
}
