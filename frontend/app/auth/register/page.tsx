'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { brand } from '@/lib/config/brand';
import { Field, inputClass, PrimaryButton } from '@/lib/ui';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', identifier_number: '', faculty: '', phone_number: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.full_name.trim().length < 3) return setError('Nama lengkap wajib diisi');
    if (!form.email.includes('@')) return setError('Format email tidak valid');
    if (form.password.length < 8 || !/(?=.*[A-Za-z])(?=.*[0-9])/.test(form.password)) return setError('Kata sandi minimal 8 karakter dan mengandung huruf + angka');
    if (form.password !== form.confirm) return setError('Konfirmasi kata sandi tidak cocok');
    setSubmitting(true);
    try {
      await register({
        email: form.email, password: form.password, full_name: form.full_name,
        identifier_number: form.identifier_number, faculty: form.faculty, phone_number: form.phone_number,
      });
      router.push('/auth/login?registered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrasi gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <Image src="/logo-upnvj.png" alt="Logo UPN Veteran Jakarta" width={36} height={36} className="h-[50px] w-[50px] object-contain" />
          <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{brand.displayName}</span>
        </Link>
        <form onSubmit={(e) => void submit(e)} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Registrasi Penulis</h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Khusus Author (dosen/mahasiswa). Akun Reviewer & Editor dibuat oleh LPPM.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nama Lengkap & Gelar"><input value={form.full_name} onChange={set('full_name')} className={inputClass} placeholder="Dr. Nama Lengkap, S.T., M.T." /></Field></div>
            <div className="sm:col-span-2"><Field label="Email"><input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="nama@upnvj.ac.id" /></Field></div>
            <Field label="NIDN / NIM"><input value={form.identifier_number} onChange={set('identifier_number')} className={inputClass} placeholder="0410128801" /></Field>
            <Field label="Fakultas / Prodi"><input value={form.faculty} onChange={set('faculty')} className={inputClass} placeholder="Fakultas Teknik" /></Field>
            <div className="sm:col-span-2"><Field label="Nomor WhatsApp"><input value={form.phone_number} onChange={set('phone_number')} className={inputClass} placeholder="0812-xxxx-xxxx" /></Field></div>
            <Field label="Kata Sandi"><input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className={inputClass} placeholder="Min. 8 karakter" /></Field>
            <Field label="Konfirmasi Kata Sandi"><input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} className={inputClass} /></Field>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <PrimaryButton type="submit" disabled={submitting} className="mt-5 w-full">
            {submitting ? 'Mendaftarkan...' : 'Daftar sebagai Penulis'}
          </PrimaryButton>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Sudah punya akun?{' '}
          <Link href="/auth/login" className="font-semibold text-[#1E6F3D] hover:underline dark:text-[#238636]">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
