'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, BookOpen, Clock, Library, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { formatDate } from '@/lib/api';
import { LoadingState, PageHeader } from '@/lib/ui';
import { NotificationItem, STATUS_LABEL } from '@/lib/types';

type Stats = Record<string, number>;

export default function DashboardPage() {
  const { token, role, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!token) return;
    void api.get<Stats>('/users/me/stats', token).then(setStats).catch(() => setStats({}));
    void api.get<NotificationItem[]>('/users/me/notifications', token).then(setNotifications).catch(() => setNotifications([]));
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

          {role !== 'LPPM' && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Aksi Cepat</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {role === 'AUTHOR' && <QuickLink href="/pengajuan/tambah" label="Ajukan Naskah Baru" />}
                {role === 'AUTHOR' && <QuickLink href="/pengajuan" label="Lihat Pengajuan Saya" />}
                {(role === 'REVIEWER' || role === 'EDITOR') && <QuickLink href="/booklist" label="Buka Booklist Tugas" />}
                <QuickLink href="/profile" label="Profil & Kontribusi" />
              </div>
            </div>
          )}

          <section className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900" aria-label="Notifikasi perubahan status">
            <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
              <Bell className="h-4 w-4 text-[#1E6F3D] dark:text-[#238636]" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Notifikasi Perubahan Status</h2>
            </div>
            {notifications.length === 0 ? (
              <p className="px-5 py-6 text-xs text-zinc-400">Belum ada perubahan status terbaru.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link href={detailHref(role, notification.book_id)} className="block px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{notification.book_title}</p>
                          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                            {notification.from_status ? `${STATUS_LABEL[notification.from_status]} → ` : ''}{STATUS_LABEL[notification.to_status]}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-zinc-400">{formatDate(notification.created_at)}</span>
                      </div>
                      {notification.notes && <p className="mt-1 line-clamp-1 text-[11px] text-zinc-500">{notification.notes}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function detailHref(role: string | null, bookId: string): string {
  if (role === 'LPPM') return `/manajemen-buku/${bookId}`;
  if (role === 'REVIEWER' || role === 'EDITOR') return `/booklist/${bookId}`;
  return `/pengajuan/${bookId}`;
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
