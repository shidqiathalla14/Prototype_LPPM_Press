'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { brand } from '@/lib/config/brand';
import { Field, inputClass, PrimaryButton } from '@/lib/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Format email tidak valid'); return; }
    if (password.length < 1) { setError('Kata sandi wajib diisi'); return; }
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo-upnvj.png" alt="Logo UPN Veteran Jakarta" width={70} height={70} className="h-[70px] w-[70px] object-contain" />
          <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{brand.displayName}</span>
        </Link>
        <form onSubmit={(e) => void submit(e)} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Masuk ke Akun Anda</h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Akses dasbor penerbitan buku LPPM Press.</p>
          <div className="mt-5 space-y-4">
            <Field label="Email">
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="nama@upnvj.ac.id" />
            </Field>
            <Field label="Kata Sandi">
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </Field>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            <PrimaryButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Memproses...' : 'Masuk'}
            </PrimaryButton>
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Belum punya akun penulis?{' '}
          <Link href="/auth/register" className="font-semibold text-[#1E6F3D] hover:underline dark:text-[#238636]">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
}
