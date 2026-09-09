'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { api, formatDate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Book } from '@/lib/types';
import { EmptyState, Field, inputClass, LoadingState, PageHeader, PrimaryButton, Toast } from '@/lib/ui';

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: '', identifier_number: '', institution: '', faculty: '', phone_number: '' });
  const [books, setBooks] = useState<Book[] | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '', identifier_number: user.identifier_number || '',
        institution: user.institution || '', faculty: user.faculty || '', phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (token) void api.get<Book[]>('/users/me/contributions', token).then(setBooks).catch(() => setBooks([]));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.patch('/users/me', form, token);
      await refreshUser();
      setToast({ kind: 'success', message: 'Profil berhasil diperbarui' });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Gagal memperbarui profil' });
    } finally { setSubmitting(false); }
  };

  if (!user) return <DashboardShell><LoadingState /></DashboardShell>;

  return (
    <DashboardShell>
      <PageHeader title="Profil" description="Identitas akademik dan portofolio karya terbit Anda." />
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={(e) => void submit(e)} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Identitas Personal</h2>
          <div className="mt-4 space-y-4">
            <Field label="Email (tidak dapat diubah)">
              <input value={user.email} disabled className={`${inputClass} opacity-60`} />
            </Field>
            <Field label="Nama Lengkap & Gelar">
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="NIDN / NIM">
                <input value={form.identifier_number} onChange={(e) => setForm({ ...form, identifier_number: e.target.value })} className={inputClass} />
              </Field>
              <Field label="WhatsApp">
                <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Institusi">
              <input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Fakultas / Prodi">
              <input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} className={inputClass} />
            </Field>
            <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</PrimaryButton>
            </div>
          </div>
        </form>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Daftar Kontribusi Buku</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Karya Anda yang telah resmi terbit ber-ISBN.</p>
          {!books ? (
            <LoadingState />
          ) : books.length === 0 ? (
            <div className="mt-4"><EmptyState title="Belum ada karya terbit" description="Buku yang berstatus Terbit akan tampil sebagai portofolio di sini." /></div>
          ) : (
            <ul className="mt-4 space-y-3">
              {books.map((b) => (
                <li key={b.id} className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5EE] dark:bg-[#143823]/60">
                    <BookOpen className="h-4 w-4 text-[#1E6F3D] dark:text-[#EAF5EE]" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{b.title}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {b.category} · ISBN <span className="font-mono">{b.isbn}</span> · Terbit {formatDate(b.updated_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
    </DashboardShell>
  );
}
