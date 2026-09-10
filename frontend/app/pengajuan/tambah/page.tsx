'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Field, GhostButton, inputClass, PageHeader, PrimaryButton, Toast } from '@/lib/ui';

const CATEGORIES = [
  'Teknik Informatika', 'Teknik Sipil', 'Teknik Elektro', 'Teknik Mesin', 'Teknik Industri',
  'Ekonomi dan Bisnis', 'Hukum', 'Ilmu Sosial', 'Ilmu Komunikasi', 'Kesehatan', 'Pertanian', 'Sains dan Matematika', 'Lainnya',
];

export default function TambahPengajuanPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [abstract, setAbstract] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (title.trim().length < 10) return setError('Judul minimal 10 karakter');
    if (!category) return setError('Pilih kategori keilmuan');
    if (abstract.trim().length < 100) return setError(`Abstrak minimal 100 karakter (saat ini ${abstract.trim().length})`);
    if (!file) return setError('Berkas naskah wajib diunggah');
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('category', category);
      form.append('abstract', abstract.trim());
      form.append('file', file);
      const book = await api.postForm<{ id: string }>('/books', form, token);
      router.push(`/pengajuan/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengajukan naskah');
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader title="Ajukan Naskah Baru" description="Lengkapi metadata buku dan unggah naskah perdana (v1)." />
      <form onSubmit={(e) => void submit(e)} className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-5">
          <Field label="Judul Naskah" hint="Judul lengkap buku sesuai naskah.">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Contoh: Metodologi Penelitian Kuantitatif untuk Ilmu Sosial" />
          </Field>
          <Field label="Kategori Keilmuan">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">Pilih kategori</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Abstrak" hint={`${abstract.trim().length}/100 karakter minimum`}>
            <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={6} className={inputClass} placeholder="Ringkasan isi buku, tujuan, dan kontribusi keilmuan..." />
          </Field>
          <Field label="Berkas Naskah (PDF/DOCX, maks. 20MB)" hint="Berkas ini tercatat sebagai versi 1 dan tidak akan pernah ditimpa.">
            <input type="file" accept=".pdf,.docx,.doc" onChange={(e) => setFile(e.target.files?.[0] || null)} className={inputClass} />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <GhostButton onClick={() => router.push('/pengajuan')}>Batal</GhostButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'Mengunggah...' : 'Kirim Pengajuan'}</PrimaryButton>
          </div>
        </div>
      </form>
    </DashboardShell>
  );
}
