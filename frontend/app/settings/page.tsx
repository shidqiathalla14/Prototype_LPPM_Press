'use client';

import { FormEvent, useState } from 'react';
import { Bug, Moon, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DashboardShell } from '@/lib/shell';
import { Field, inputClass, PageHeader, PrimaryButton, Toast } from '@/lib/ui';

export default function SettingsPage() {
  const { token } = useAuth();
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [bug, setBug] = useState({ subject: '', description: '' });
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) {
      setToast({ kind: 'error', message: 'Konfirmasi kata sandi baru tidak cocok' });
      return;
    }
    setSubmitting('pwd');
    try {
      await api.patch('/users/me/password', { current_password: pwd.current_password, new_password: pwd.new_password }, token);
      setToast({ kind: 'success', message: 'Kata sandi berhasil diperbarui' });
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Gagal mengubah kata sandi' });
    } finally { setSubmitting(null); }
  };

  const submitBug = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting('bug');
    try {
      await api.post('/settings/bug-report', bug, token);
      setToast({ kind: 'success', message: 'Laporan kendala terkirim ke tim LPPM' });
      setBug({ subject: '', description: '' });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Gagal mengirim laporan' });
    } finally { setSubmitting(null); }
  };

  return (
    <DashboardShell>
      <PageHeader title="Pengaturan" description="Tampilan, keamanan akun, dan bantuan teknis." />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            <Sun className="h-4 w-4 text-zinc-400" strokeWidth={1.75} /> Tampilan
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Gunakan ikon <Moon className="inline h-3 w-3" />/<Sun className="inline h-3 w-3" /> di bilah atas untuk beralih mode terang/gelap. Preferensi tersimpan otomatis di perangkat Anda.</p>
        </section>

        <form onSubmit={(e) => void changePassword(e)} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Keamanan Akun</h2>
          <div className="mt-4 space-y-4">
            <Field label="Kata Sandi Saat Ini">
              <input type="password" autoComplete="current-password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Kata Sandi Baru" hint="Min. 8 karakter, mengandung huruf dan angka.">
              <input type="password" autoComplete="new-password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Konfirmasi Kata Sandi Baru">
              <input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className={inputClass} />
            </Field>
            <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <PrimaryButton type="submit" disabled={submitting === 'pwd'}>{submitting === 'pwd' ? 'Menyimpan...' : 'Perbarui Kata Sandi'}</PrimaryButton>
            </div>
          </div>
        </form>

        <form onSubmit={(e) => void submitBug(e)} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            <Bug className="h-4 w-4 text-zinc-400" strokeWidth={1.75} /> Lapor Bug & Bantuan
          </h2>
          <div className="mt-4 space-y-4">
            <Field label="Judul Kendala">
              <input value={bug.subject} onChange={(e) => setBug({ ...bug, subject: e.target.value })} className={inputClass} placeholder="Contoh: Gagal mengunggah naskah" />
            </Field>
            <Field label="Deskripsi">
              <textarea value={bug.description} onChange={(e) => setBug({ ...bug, description: e.target.value })} rows={4} className={inputClass} placeholder="Jelaskan kendala yang Anda alami, langkah sebelum error terjadi..." />
            </Field>
            <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <PrimaryButton type="submit" disabled={submitting === 'bug' || !bug.subject || !bug.description}>
                {submitting === 'bug' ? 'Mengirim...' : 'Kirim Laporan'}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </div>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
    </DashboardShell>
  );
}
