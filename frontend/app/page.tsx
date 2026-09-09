'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronRight, LogIn, Search, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Book, CatalogResponse } from '@/lib/types';
import { LoadingState } from '@/lib/ui';

const WORKFLOW = [
  { n: 1, title: 'Pengajuan', desc: 'Author mengunggah naskah dan metadata buku.' },
  { n: 2, title: 'Review Substantif', desc: 'Reviewer menelaah kelayakan isi dan kebaruan.' },
  { n: 3, title: 'Editing', desc: 'Editor menyempurnakan tata bahasa dan tata letak.' },
  { n: 4, title: 'Pembayaran', desc: 'Naskah final terkunci; author mengunggah bukti bayar.' },
  { n: 5, title: 'ISBN & Terbit', desc: 'LPPM menerbitkan ISBN resmi Perpusnas RI.' },
];

function BookCard({ book }: { book: Book }) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-4 transition-all duration-200 hover:border-[#1E6F3D]/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#238636]/60">
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50/70 p-3 transition-colors group-hover:bg-[#EAF5EE]/40 dark:border-zinc-800/60 dark:bg-zinc-950/50">
        <div className="text-center">
          <span className="inline-block rounded bg-[#1E6F3D] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            ISBN Terbit
          </span>
          <p className="mt-2 line-clamp-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100">{book.title}</p>
          {book.isbn && <p className="mt-1 font-mono text-[10px] text-zinc-400">{book.isbn}</p>}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">Penulis</p>
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{book.author_name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {book.category}
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (s: string, c: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set('search', s);
      if (c) params.set('category', c);
      setCatalog(await api.get<CatalogResponse>(`/books/public-catalog?${params.toString()}`));
    } catch {
      setCatalog({ items: [], categories: [], stats: { published: 0, authors: 0 } });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load('', ''); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => void load(search, category), 350);
    return () => clearTimeout(t);
  }, [search, category, load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-upnvj.png" alt="Logo UPN Veteran Jakarta" width={36} height={36} className="h-9 w-9 object-contain" />
            <span>
              <span className="block text-sm font-bold leading-tight text-zinc-950 dark:text-zinc-50">LPPM Press</span>
              <span className="block text-[11px] leading-tight text-zinc-400">UPN Veteran Jakarta</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <a href="#katalog" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:block dark:text-zinc-400">Katalog</a>
            <a href="#alur" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:block dark:text-zinc-400">Alur Penerbitan</a>
            <Link href="/auth/login" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-subtle transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              <LogIn className="h-4 w-4" strokeWidth={1.75} /> Masuk
            </Link>
            <Link href="/auth/register" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E6F3D] px-4 py-2 text-sm font-medium text-white shadow-subtle transition-all hover:bg-[#143823] dark:bg-[#238636]">
              <UserPlus className="h-4 w-4" strokeWidth={1.75} /> Daftar Penulis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 text-center sm:py-24">
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.15] tracking-tight text-zinc-950 md:text-5xl dark:text-zinc-50">
          Terbitkan Buku Ilmiah Anda Bersama{' '}
          <span className="text-[#1E6F3D] dark:text-[#238636]">LPPM Press</span>{' '}
          <span className="underline decoration-[#D4E100] decoration-4 underline-offset-4">UPN Veteran Jakarta</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
          Platform terintegrasi untuk pengajuan, penelaahan, penyuntingan, hingga penerbitan ISBN resmi
          bagi karya ilmiah dan buku ajar sivitas akademika transparan di setiap tahap.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-lg bg-[#1E6F3D] px-5 py-3 text-sm font-medium text-white shadow-subtle transition-all hover:bg-[#143823] active:scale-[0.98] dark:bg-[#238636] dark:hover:bg-[#1E6F3D]">
            Ajukan Buku Sekarang <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <a href="#katalog" className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-subtle transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            <BookOpen className="h-4 w-4" strokeWidth={1.75} /> Lihat Katalog Buku
          </a>
        </div>
        <div className="mx-auto mt-12 grid max-w-lg grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-3xl font-extrabold tracking-tight text-[#1E6F3D] dark:text-[#238636]">{catalog?.stats.published ?? '—'}</p>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Buku Terbit Ber-ISBN</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-3xl font-extrabold tracking-tight text-[#1E6F3D] dark:text-[#238636]">{catalog?.stats.authors ?? '—'}</p>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Penulis Bergabung</p>
          </div>
        </div>
      </section>

      {/* Katalog */}
      <section id="katalog" className="border-t border-zinc-100 bg-zinc-50/50 py-16 dark:border-zinc-800/60 dark:bg-zinc-900/30">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl dark:text-zinc-50">Katalog Buku Terbit</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Karya resmi ber-ISBN yang diterbitkan LPPM Press UPNVJ.</p>
            </div>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul, penulis, atau ISBN..."
                className="h-9 w-64 rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-xs text-zinc-900 placeholder-zinc-400 transition-all focus:w-80 focus:border-[#1E6F3D] focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#238636]"
              />
              <kbd className="absolute right-2.5 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">/</kbd>
            </div>
          </div>
          {(catalog?.categories.length ?? 0) > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <button onClick={() => setCategory('')} className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${!category ? 'border-[#1E6F3D] bg-[#1E6F3D] text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'}`}>
                Semua
              </button>
              {catalog!.categories.map((c) => (
                <button key={c} onClick={() => setCategory(c === category ? '' : c)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${category === c ? 'border-[#1E6F3D] bg-[#1E6F3D] text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <LoadingState label="Memuat katalog..." />
          ) : catalog && catalog.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.items.map((b) => <BookCard key={b.id} book={b} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-500">Tidak ada buku yang cocok dengan pencarian Anda.</p>
              <p className="mt-1 text-xs text-zinc-400">Coba kata kunci atau kategori lain.</p>
            </div>
          )}
        </div>
      </section>

      {/* Alur */}
      <section id="alur" className="container py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl dark:text-zinc-50">Alur Pelayanan Penerbitan</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-zinc-600 dark:text-zinc-400">
          Lima tahap terstruktur dari naskah mentah hingga buku resmi ber-ISBN.
        </p>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-5">
          {WORKFLOW.map((w) => (
            <li key={w.n} className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#143823] text-xs font-bold text-[#D4E100]">{w.n}</span>
              <p className="mt-3 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{w.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{w.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-10 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="container flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div>
            <p className="text-sm font-bold text-zinc-950 dark:text-zinc-50">LPPM Press UPN Veteran Jakarta</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Lembaga Penelitian dan Pengabdian kepada Masyarakat<br />
              Jl. RS Fatmawati, Pondok Labu, Cilandak, Jakarta Selatan 12450
            </p>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Narahubung</p>
            <p className="mt-1.5">Email: lppm@upnvj.ac.id</p>
            <p>Telp: (021) 765-6971</p>
          </div>
        </div>
        <p className="container mt-8 border-t border-zinc-200 pt-6 text-[11px] text-zinc-400 dark:border-zinc-800">
          © 2026 LPPM UPN Veteran Jakarta. Seluruh hak cipta dilindungi.
        </p>
      </footer>
    </div>
  );
}
