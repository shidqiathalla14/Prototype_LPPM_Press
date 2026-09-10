'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen, Home, LayoutDashboard, Library, LogOut, Menu, Moon, Settings, Sun, User as UserIcon, X,
} from 'lucide-react';
import { useAuth } from './auth';
import { brand } from './config/brand';
import { Role } from './types';

const NAV: Record<Role, { href: string; label: string; icon: typeof Home }[]> = {
  AUTHOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pengajuan', label: 'Pengajuan', icon: BookOpen },
    { href: '/profile', label: 'Profil', icon: UserIcon },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ],
  REVIEWER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/booklist', label: 'Booklist', icon: Library },
    { href: '/profile', label: 'Profil', icon: UserIcon },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ],
  EDITOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/booklist', label: 'Booklist', icon: Library },
    { href: '/profile', label: 'Profil', icon: UserIcon },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ],
  LPPM: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/manajemen-buku', label: 'Manajemen Buku', icon: Library },
    { href: '/profile', label: 'Profil', icon: UserIcon },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ],
};

const ROLE_LABEL: Record<Role, string> = { AUTHOR: 'Author', REVIEWER: 'Reviewer', EDITOR: 'Editor', LPPM: 'LPPM' };

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('lppm_theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);
  return (
    <button
      aria-label="Ganti tema"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('lppm_theme', next ? 'dark' : 'light');
      }}
      className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {dark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  );
}

function ImpersonationBar() {
  const { impersonating, role, stopImpersonation, realRole, impersonate } = useAuth();
  if (realRole !== 'LPPM') return null;
  return (
    <div className="sticky top-0 z-50 flex h-10 w-full items-center justify-between gap-2 border-b border-[#143823] bg-[#143823] px-4 text-xs text-zinc-100 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full bg-[#D4E100] ${impersonating ? 'animate-pulse' : ''}`} />
        <span className="hidden font-semibold text-zinc-200 sm:inline">Mode LPPM. Lihat sebagai:</span>
        <span className="font-semibold text-zinc-200 sm:hidden">See as:</span>
        <select
          aria-label="Pilih mode tampilan"
          value={impersonating && role ? role : 'LPPM'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'LPPM') { if (impersonating) void stopImpersonation(); }
            else void impersonate(v as Role);
          }}
          className="rounded border border-[#238636] bg-[#1E6F3D] px-2 py-0.5 font-mono text-xs font-bold text-white focus:outline-none"
        >
          <option value="LPPM">LPPM (Asli)</option>
          <option value="AUTHOR">AUTHOR</option>
          <option value="REVIEWER">REVIEWER</option>
          <option value="EDITOR">EDITOR</option>
        </select>
      </div>
      {impersonating && (
        <button onClick={() => void stopImpersonation()} className="inline-flex items-center gap-1 text-xs font-medium text-[#D4E100] transition-colors hover:underline">
          <span className="hidden sm:inline">Kembali ke Mode LPPM</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, role, realRole, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [loading, user, router]);

  if (loading || !user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-400 dark:bg-zinc-950">
        Memuat sesi...
      </div>
    );
  }

  const hasImpersonationBar = realRole === 'LPPM';
  const nav = NAV[role];

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <Image src="/logo-upnvj.png" alt="Logo UPN Veteran Jakarta" width={32} height={32} className="h-8 w-8 object-contain" />
        <span>
          <span className="block text-sm font-bold leading-tight text-zinc-950 dark:text-zinc-50">{brand.name}</span>
          <span className="block text-[11px] leading-tight text-zinc-400">{brand.institution}</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Navigasi utama">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-[#EAF5EE] text-[#143823] dark:bg-[#143823]/60 dark:text-[#EAF5EE]'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="mb-2 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
          <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{user.full_name}</p>
          <p className="text-[11px] text-zinc-400">{ROLE_LABEL[role]} · {user.email}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400">
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <ImpersonationBar />
      {/* Header mobile */}
      <div className={`sticky z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-900 ${hasImpersonationBar ? 'top-10' : 'top-0'}`}>
        <button aria-label="Buka menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{brand.name}</span>
        <ThemeToggle />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-zinc-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex justify-end p-2">
              <button aria-label="Tutup menu" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex">
        <aside
          className="fixed bottom-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-white lg:block dark:border-zinc-800 dark:bg-zinc-900"
          style={{ top: hasImpersonationBar ? '2.5rem' : '0' }}
        >
          {sidebar}
        </aside>
        <main className="min-h-screen flex-1 lg:ml-64">
          <div
            className="sticky z-20 hidden h-14 items-center justify-end gap-2 border-b border-zinc-200 bg-white/80 px-6 backdrop-blur lg:flex dark:border-zinc-800 dark:bg-zinc-900/80"
            style={{ top: hasImpersonationBar ? '2.5rem' : '0' }}
          >
            <Link href="/" className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-[#1E6F3D] dark:text-zinc-400">
              <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
              Halaman Publik
            </Link>
            <ThemeToggle />
          </div>
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
