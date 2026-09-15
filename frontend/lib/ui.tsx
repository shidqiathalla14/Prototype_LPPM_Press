'use client';

import { ReactNode, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';
import { BookStatus, STATUS_BADGE_CLASS, STATUS_LABEL } from './types';

export function StatusBadge({ status }: { status: BookStatus }) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
      <Inbox className="h-10 w-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
      <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500 dark:text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 py-12 text-center dark:border-red-900 dark:bg-red-950/20">
      <AlertCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
      <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function Toast({ kind, message, onClose }: { kind: 'success' | 'error'; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div role="status" className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-card ${
      kind === 'success'
        ? 'border-[#1E6F3D]/30 bg-[#EAF5EE] text-[#143823] dark:border-[#238636] dark:bg-[#143823] dark:text-[#EAF5EE]'
        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
    }`}>
      {kind === 'success' ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> : <AlertCircle className="h-4 w-4" strokeWidth={1.75} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} aria-label="Tutup" className="ml-1 opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-zinc-950/50" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl border border-zinc-200 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
          <button onClick={onClose} aria-label="Tutup dialog" className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick, type = 'button', className = '' }: {
  children: ReactNode; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit'; className?: string;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E6F3D] px-4 py-2.5 text-sm font-medium text-white shadow-subtle transition-all hover:bg-[#143823] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6F3D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#238636] dark:hover:bg-[#1E6F3D] ${className}`}>
      {children}
    </button>
  );
}

export function GhostButton({ children, disabled, onClick, type = 'button', className = '' }: {
  children: ReactNode; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit'; className?: string;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-subtle transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${className}`}>
      {children}
    </button>
  );
}

export function DangerButton({ children, disabled, onClick, className = '' }: {
  children: ReactNode; disabled?: boolean; onClick?: () => void; className?: string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40 ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-[#1E6F3D] focus:outline-none focus:ring-2 focus:ring-[#1E6F3D]/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-[#238636]';
