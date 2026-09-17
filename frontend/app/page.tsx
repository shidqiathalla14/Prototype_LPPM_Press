'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, Facebook, FileText, Instagram, LogIn, Mail, MapPin, Phone, Search, Youtube } from 'lucide-react';
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

const HERO_SLIDES = [
  {
    image: 'https://upa-luk.upnvj.ac.id/images/hero-upnvj.webp',
    eyebrow: 'Kampus Bela Negara',
    title: 'Gagasan ilmiah, diterbitkan untuk memberi dampak.',
    description: 'LPPM Press mendampingi sivitas akademika UPN Veteran Jakarta dalam mengubah naskah berkualitas menjadi buku yang terkurasi dan ber-ISBN.',
  },
  {
    image: 'https://upa-luk.upnvj.ac.id/storage/cms/images/m1yMQzjtFa0UWoOIkhn8zYCN72GnGZiwG6uprz9L.png',
    eyebrow: 'Identitas UPN Veteran Jakarta',
    title: 'Ruang kampus untuk karya yang terus hidup.',
    description: 'Terbitkan hasil penelitian, buku ajar, dan monograf melalui proses editorial yang jelas bersama penerbit resmi UPNVJ.',
  },
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
  const [heroIndex, setHeroIndex] = useState(0);
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
  useEffect(() => {
    const timer = setInterval(() => setHeroIndex((index) => (index + 1) % HERO_SLIDES.length), 12000);
    return () => clearInterval(timer);
  }, []);

  const hero = HERO_SLIDES[heroIndex];

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="bg-[#143823] text-xs text-white/80">
        <div className="container flex min-h-9 items-center justify-between gap-4">
          <span className="hidden sm:inline">Lembaga Penelitian dan Pengabdian kepada Masyarakat</span>
          <span className="ml-auto">UPN Veteran Jakarta</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[#f7f8f3]/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="container flex min-h-[76px] items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-upnvj.png" alt="Logo UPN Veteran Jakarta" width={46} height={46} className="h-11 w-11 object-contain" />
            <span className="border-l border-zinc-300 pl-3 dark:border-zinc-700">
              <span className="block text-base font-black tracking-tight text-[#143823] dark:text-white">LPPM Press</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">UPN Veteran Jakarta</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <a href="#tentang" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-[#1E6F3D] dark:text-zinc-400">Tentang Kami</a>
            <a href="#katalog" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-[#1E6F3D] dark:text-zinc-400">Katalog</a>
            <a href="#alur" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-[#1E6F3D] dark:text-zinc-400">Layanan</a>
            <Link href="/auth/login" className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-[#1E6F3D]/30 px-4 py-2 text-sm font-semibold text-[#143823] hover:bg-[#EAF5EE] dark:text-[#EAF5EE]">
              <LogIn className="h-4 w-4" /> Masuk
            </Link>
            <Link href="/auth/register" className="inline-flex items-center gap-1.5 rounded-md bg-[#1E6F3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143823]">
              Daftar Penulis <ArrowUpRight className="h-4 w-4" />
            </Link>
          </nav>
          <Link href="/auth/login" className="text-sm font-semibold text-[#1E6F3D] lg:hidden">Masuk</Link>
        </div>
      </header>

      <main>
        <section className="relative min-h-[560px] overflow-hidden bg-[#143823] text-white">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.image}
              aria-hidden={index !== heroIndex}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === heroIndex ? 'opacity-100' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b2417]/95 via-[#143823]/80 to-[#143823]/25" />
          <div className="container relative flex min-h-[560px] items-center py-16 lg:py-20">
            <div className="max-w-2xl">
              <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#dce96b]"><span className="h-px w-8 bg-[#dce96b]" /> {hero.eyebrow}</p>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.06] tracking-tight transition-all duration-500 sm:text-6xl">{hero.title}</h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 transition-all duration-500 sm:text-lg">{hero.description}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-md bg-[#dce96b] px-5 py-3 text-sm font-bold text-[#143823] hover:bg-white">Ajukan Naskah <ChevronRight className="h-4 w-4" /></Link>
                <a href="#katalog" className="inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><BookOpen className="h-4 w-4" /> Jelajahi Katalog</a>
              </div>
            </div>
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3 lg:left-auto lg:right-8 lg:translate-x-0">
              <button type="button" aria-label="Foto sebelumnya" onClick={() => setHeroIndex((heroIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="rounded-full border border-white/30 p-2 text-white hover:bg-white/15"><ChevronLeft className="h-4 w-4" /></button>
              {HERO_SLIDES.map((slide, index) => <button type="button" key={slide.image} aria-label={`Tampilkan foto ${index + 1}`} onClick={() => setHeroIndex(index)} className={`h-2 rounded-full transition-all ${index === heroIndex ? 'w-8 bg-[#dce96b]' : 'w-2 bg-white/50'}`} />)}
              <button type="button" aria-label="Foto berikutnya" onClick={() => setHeroIndex((heroIndex + 1) % HERO_SLIDES.length)} className="rounded-full border border-white/30 p-2 text-white hover:bg-white/15"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="container grid divide-y divide-zinc-200 py-1 dark:divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-4 px-4 py-5 sm:px-8"><CheckCircle2 className="h-7 w-7 text-[#1E6F3D]" /><div><p className="text-2xl font-black text-[#143823] dark:text-white">{catalog?.stats.published ?? '-'}</p><p className="text-xs font-medium text-zinc-500">Buku terbit ber-ISBN</p></div></div>
            <div className="flex items-center gap-4 px-4 py-5 sm:px-8"><FileText className="h-7 w-7 text-[#1E6F3D]" /><div><p className="text-2xl font-black text-[#143823] dark:text-white">{catalog?.stats.authors ?? '-'}</p><p className="text-xs font-medium text-zinc-500">Penulis bergabung</p></div></div>
            <div className="flex items-center gap-4 px-4 py-5 sm:px-8"><ClipboardList className="h-7 w-7 text-[#1E6F3D]" /><div><p className="text-2xl font-black text-[#143823] dark:text-white">5 tahap</p><p className="text-xs font-medium text-zinc-500">Proses penerbitan transparan</p></div></div>
          </div>
        </section>

        <section id="tentang" className="container grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E6F3D]">Tentang LPPM Press</p><h2 className="mt-3 text-3xl font-black leading-tight text-[#143823] sm:text-4xl dark:text-white">Menerbitkan pengetahuan dari kampus untuk masyarakat.</h2></div>
          <div className="max-w-2xl"><p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">Kami hadir sebagai ruang editorial UPN Veteran Jakarta untuk mendukung lahirnya buku ajar, monograf, dan karya ilmiah yang relevan, teruji, dan mudah diakses.</p><p className="mt-5 text-sm leading-relaxed text-zinc-500">Setiap naskah diproses melalui tahapan yang jelas, mulai dari pengajuan hingga penerbitan ISBN. Penulis dapat memantau proses dan berkomunikasi dengan tim melalui satu platform.</p><a href="#alur" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#1E6F3D] hover:underline">Kenali alur penerbitan <ArrowUpRight className="h-4 w-4" /></a></div>
        </section>

        <section id="katalog" className="bg-white py-20 dark:bg-zinc-900">
          <div className="container">
            <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E6F3D]">Koleksi Terbitan</p><h2 className="mt-2 text-3xl font-black text-[#143823] dark:text-white">Katalog buku</h2><p className="mt-2 text-sm text-zinc-500">Temukan karya resmi yang diterbitkan LPPM Press UPNVJ.</p></div><div className="relative flex items-center"><Search className="absolute left-3 h-4 w-4 text-zinc-400" /><input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, penulis, ISBN..." className="h-11 w-full rounded-md border border-zinc-200 bg-[#f7f8f3] pl-10 pr-4 text-sm focus:border-[#1E6F3D] focus:outline-none sm:w-72 dark:border-zinc-700 dark:bg-zinc-950" /></div></div>
            {(catalog?.categories.length ?? 0) > 0 && <div className="mb-8 flex flex-wrap gap-2"><button onClick={() => setCategory('')} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${!category ? 'border-[#1E6F3D] bg-[#1E6F3D] text-white' : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}>Semua</button>{catalog!.categories.map((c) => <button key={c} onClick={() => setCategory(c === category ? '' : c)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${category === c ? 'border-[#1E6F3D] bg-[#1E6F3D] text-white' : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}>{c}</button>)}</div>}
            {loading ? <LoadingState label="Memuat katalog..." /> : catalog && catalog.items.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{catalog.items.map((b) => <BookCard key={b.id} book={b} />)}</div> : <div className="border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700"><p className="text-sm font-medium text-zinc-500">Belum ada buku yang cocok.</p><p className="mt-1 text-xs text-zinc-400">Coba kata kunci atau kategori lain.</p></div>}
          </div>
        </section>

        <section id="alur" className="container py-20"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E6F3D]">Layanan Penerbitan</p><h2 className="mt-2 text-3xl font-black text-[#143823] dark:text-white">Dari naskah menjadi karya yang siap dibaca.</h2></div><ol className="mt-10 grid gap-px overflow-hidden border border-zinc-200 bg-zinc-200 sm:grid-cols-5 dark:border-zinc-700 dark:bg-zinc-700">{WORKFLOW.map((w) => <li key={w.n} className="bg-[#f7f8f3] p-5 dark:bg-zinc-900"><span className="text-3xl font-black text-[#d3df62]">0{w.n}</span><p className="mt-7 text-sm font-bold text-[#143823] dark:text-white">{w.title}</p><p className="mt-2 text-xs leading-relaxed text-zinc-500">{w.desc}</p></li>)}</ol></section>
      </main>

      <footer className="bg-[#143823] py-14 text-white">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.7fr_1.45fr_0.75fr]">
            <div>
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
                <Image src="/logo-upnvj.png" alt="Logo UPN Veteran Jakarta" width={72} height={72} className="h-full w-full object-contain" />
              </div>
              <p className="mt-8 max-w-sm text-sm leading-relaxed text-[#EAF5EE]">LPPM Press UPN Veteran Jakarta berdedikasi menerbitkan karya akademik yang relevan, terkurasi, dan memberi dampak bagi masyarakat.</p>
              <div className="mt-7 space-y-4 text-sm text-[#EAF5EE]">
                <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#dce96b]" /><span>Jl. RS Fatmawati, Pondok Labu,<br />Jakarta Selatan, 12450</span></p>
                <p className="flex items-center gap-3"><Mail className="h-5 w-5 shrink-0 text-[#dce96b]" /><a href="mailto:lppm@upnvj.ac.id" className="hover:text-white">lppm@upnvj.ac.id</a></p>
                <p className="flex items-center gap-3"><Phone className="h-5 w-5 shrink-0 text-[#dce96b]" /><a href="tel:+62217656971" className="hover:text-white">+62 21 765 6971</a></p>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black">Tautan Cepat</h2>
              <span className="mt-4 block h-1 w-10 rounded-full bg-[#dce96b]" />
              <nav className="mt-5 space-y-4 text-sm text-[#EAF5EE]">
                <a href="#" className="flex items-center gap-2 hover:text-white"><ChevronRight className="h-4 w-4 text-[#8fbd9e]" /> Beranda</a>
                <a href="#tentang" className="flex items-center gap-2 hover:text-white"><ChevronRight className="h-4 w-4 text-[#8fbd9e]" /> Tentang Kami</a>
                <a href="#katalog" className="flex items-center gap-2 hover:text-white"><ChevronRight className="h-4 w-4 text-[#8fbd9e]" /> Katalog Buku</a>
                <a href="#alur" className="flex items-center gap-2 hover:text-white"><ChevronRight className="h-4 w-4 text-[#8fbd9e]" /> Alur Penerbitan</a>
              </nav>
            </div>
            <div>
              <h2 className="text-xl font-black">Lokasi Kami</h2>
              <span className="mt-4 block h-1 w-10 rounded-full bg-[#dce96b]" />
              <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-lg">
                <iframe title="Lokasi LPPM Press UPN Veteran Jakarta" src="https://www.google.com/maps?q=Universitas+Pembangunan+Nasional+Veteran+Jakarta&output=embed" className="h-56 w-full border-0" loading="lazy" />
              </div>
              <a href="https://maps.google.com/?q=Universitas+Pembangunan+Nasional+Veteran+Jakarta" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#EAF5EE] hover:text-white">Buka di Google Maps <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
            <div>
              <h2 className="text-xl font-black">Media Sosial</h2>
              <span className="mt-4 block h-1 w-10 rounded-full bg-[#dce96b]" />
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="https://www.instagram.com/upnveteranjakarta" target="_blank" rel="noreferrer" aria-label="Instagram UPNVJ" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E6F3D] text-white transition-colors hover:bg-[#238636]"><Instagram className="h-5 w-5" /></a>
                <a href="https://www.youtube.com/channel/UCMw_GH6YVHMSHKcSA2WJjhw" target="_blank" rel="noreferrer" aria-label="YouTube UPNVJ" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E6F3D] text-white transition-colors hover:bg-[#238636]"><Youtube className="h-5 w-5" /></a>
                <a href="https://www.facebook.com/infoupnjakarta" target="_blank" rel="noreferrer" aria-label="Facebook UPNVJ" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E6F3D] text-white transition-colors hover:bg-[#238636]"><Facebook className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-[#8fbd9e]/20 pt-7 text-center text-sm text-[#b8d8c1]">© 2026 LPPM Press UPN Veteran Jakarta. Seluruh hak cipta dilindungi.</div>
        </div>
      </footer>
    </div>
  );
}
