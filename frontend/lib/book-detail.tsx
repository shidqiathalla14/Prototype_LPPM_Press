'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Banknote, CheckCircle2, Download, FileText, History, Lock, Upload,
} from 'lucide-react';
import { api, downloadFile, formatBytes, formatDate, formatRupiah } from './api';
import { useAuth } from './auth';
import { Book, WORKFLOW_STEPS, workflowProgress } from './types';
import {
  ErrorState, Field, GhostButton, inputClass, LoadingState, Modal, PrimaryButton, StatusBadge, Toast,
} from './ui';

function Stepper({ book }: { book: Book }) {
  const current = workflowProgress(book.status);
  return (
    <ol className="flex flex-wrap items-center gap-y-3" aria-label="Tahapan penerbitan">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = i < current || book.status === 'COMPLETED';
        const active = i === current && book.status !== 'COMPLETED';
        return (
          <li key={step.status} className="flex items-center">
            <div className="flex flex-col items-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-all ${
                done ? 'border-[#1E6F3D] bg-[#1E6F3D] text-white'
                  : active ? 'border-[#1E6F3D] bg-white text-[#1E6F3D] ring-4 ring-[#1E6F3D]/10 dark:bg-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> : i + 1}
              </span>
              <span className={`mt-1.5 whitespace-nowrap text-[11px] font-medium ${active || done ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                {step.label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className={`mx-2 mb-5 h-px w-6 sm:w-10 ${i < current ? 'bg-[#1E6F3D]' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function BookDetail({ bookId, backHref }: { bookId: string; backHref: string }) {
  const { token, role, user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [revOpen, setRevOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [revNotes, setRevNotes] = useState('');
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payAmount, setPayAmount] = useState('1500000');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBook(await api.get<Book>(`/books/${bookId}`, token));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat detail naskah');
    }
  }, [bookId, token]);

  useEffect(() => { void load(); }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!book) return <LoadingState label="Memuat detail naskah..." />;

  const isAuthor = user?.id === book.author_id;
  const isAssignedReviewer = role === 'REVIEWER' && user?.id === book.reviewer_id;
  const isAssignedEditor = role === 'EDITOR' && user?.id === book.editor_id;
  const locked = ['PAYMENT_REQUIRED', 'PAYMENT_VERIFIED', 'GETTING_ISBN', 'COMPLETED'].includes(book.status);
  const canUploadRevision = isAuthor && ['REVISION_REVIEW', 'REVISION_EDIT'].includes(book.status);
  const canEvaluate = (isAssignedReviewer && book.status === 'IN_REVIEW') || (isAssignedEditor && book.status === 'IN_EDIT');
  const canUploadPayment = isAuthor && book.status === 'PAYMENT_REQUIRED';

  const submitRevision = async () => {
    if (!revFile || !token) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', revFile);
      if (revNotes) form.append('notes', revNotes);
      await api.postForm(`/books/${bookId}/revisions`, form, token);
      setToast({ kind: 'success', message: 'Revisi berhasil diunggah sebagai versi baru' });
      setRevOpen(false); setRevFile(null); setRevNotes('');
      await load();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Gagal mengunggah revisi' });
    } finally { setSubmitting(false); }
  };

  const submitPayment = async () => {
    if (!payFile || !token) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('amount', payAmount);
      form.append('proof_file', payFile);
      await api.postForm(`/payments/${bookId}`, form, token);
      setToast({ kind: 'success', message: 'Bukti pembayaran terkirim — menunggu verifikasi LPPM' });
      setPayOpen(false); setPayFile(null);
      await load();
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Gagal mengunggah bukti pembayaran' });
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <button onClick={() => router.push(backHref)} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-[#1E6F3D] dark:text-zinc-400">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} /> Kembali
      </button>

      {/* Metadata */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{book.title}</h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {book.author_name} · {book.category} · Diajukan {formatDate(book.created_at)}
              {book.current_version ? ` · v${book.current_version}` : ''}
            </p>
          </div>
          <StatusBadge status={book.status} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{book.abstract}</p>
        <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <Stepper book={book} />
        </div>
      </div>

      {/* Payment lock notice */}
      {locked && book.status !== 'COMPLETED' && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" strokeWidth={1.75} />
          <div className="text-xs leading-relaxed text-orange-800 dark:text-orange-300">
            <strong>Naskah FINAL & terkunci.</strong> Sejak tahap pembayaran, berkas naskah tidak dapat diubah oleh pihak manapun
            untuk menjamin berkas yang dibayar dan didaftarkan ISBN adalah berkas yang telah disetujui.
          </div>
        </div>
      )}
      {book.status === 'COMPLETED' && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#1E6F3D]/30 bg-[#EAF5EE] p-4 dark:border-[#238636] dark:bg-[#143823]/60">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1E6F3D] dark:text-[#EAF5EE]" strokeWidth={1.75} />
          <div className="text-xs leading-relaxed text-[#143823] dark:text-[#EAF5EE]">
            <strong>Buku resmi terbit</strong> dengan ISBN <span className="font-mono font-bold">{book.isbn}</span>.
          </div>
        </div>
      )}

      {/* Action area */}
      {(canUploadRevision || canUploadPayment) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canUploadRevision && (
            <PrimaryButton onClick={() => setRevOpen(true)}>
              <Upload className="h-4 w-4" strokeWidth={1.75} /> Unggah Naskah Revisi
            </PrimaryButton>
          )}
          {canUploadPayment && (
            <PrimaryButton onClick={() => setPayOpen(true)}>
              <Banknote className="h-4 w-4" strokeWidth={1.75} />
              {book.payment?.status === 'REJECTED' ? 'Unggah Ulang Bukti Pembayaran' : 'Unggah Bukti Pembayaran'}
            </PrimaryButton>
          )}
        </div>
      )}

      {/* Evaluate shortcut */}
      {canEvaluate && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Naskah ini menunggu evaluasi Anda. Unduh berkas terbaru, lalu kirim keputusan melalui formulir evaluasi di halaman Booklist.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Riwayat versi */}
        <section className="rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900" aria-label="Riwayat versi naskah">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <FileText className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Riwayat Versi Naskah</h2>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(book.files || []).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                    v{f.version} — {f.file_name}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {f.stage} · {formatBytes(f.file_size_bytes)} · {formatDate(f.created_at)}{f.uploaded_by_name ? ` · ${f.uploaded_by_name}` : ''}
                  </p>
                  {f.notes && <p className="mt-0.5 text-[11px] italic text-zinc-500">&ldquo;{f.notes}&rdquo;</p>}
                </div>
                <button
                  onClick={() => token && void downloadFile(`/books/files/${f.id}/download`, token, f.file_name).catch(() => setToast({ kind: 'error', message: 'Gagal mengunduh berkas' }))}
                  className="shrink-0 rounded-lg border border-zinc-200 p-2 text-zinc-500 transition-all hover:border-[#1E6F3D]/50 hover:text-[#1E6F3D] dark:border-zinc-700 dark:text-zinc-400"
                  aria-label={`Unduh ${f.file_name}`}
                >
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Catatan evaluasi */}
        <section className="rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900" aria-label="Catatan evaluasi">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <History className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Catatan Review & Editorial</h2>
          </div>
          {(book.review_logs || []).length === 0 ? (
            <p className="px-5 py-6 text-xs text-zinc-400">Belum ada catatan evaluasi.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {book.review_logs!.map((log) => (
                <li key={log.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                      {log.reviewer_name} <span className="font-normal text-zinc-400">({log.role_type})</span>
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      log.decision === 'APPROVED'
                        ? 'border-[#1E6F3D]/30 bg-[#EAF5EE] text-[#143823] dark:border-[#238636] dark:bg-[#143823]/60 dark:text-[#EAF5EE]'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {log.decision === 'APPROVED' ? 'Disetujui' : 'Minta Revisi'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{log.notes}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">{formatDate(log.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pembayaran */}
        <section className="rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900" aria-label="Informasi pembayaran">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <Banknote className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Pembayaran & ISBN</h2>
          </div>
          <div className="px-5 py-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {!book.payment && <p>Belum ada data pembayaran. Tagihan diterbitkan setelah draf disetujui editor.</p>}
            {book.payment && (
              <dl className="space-y-1.5">
                <div className="flex justify-between"><dt className="text-zinc-400">Nominal</dt><dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatRupiah(book.payment.amount)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-400">Status</dt><dd className="font-medium">{book.payment.status}</dd></div>
                {book.payment.verified_at && <div className="flex justify-between"><dt className="text-zinc-400">Diverifikasi</dt><dd>{formatDate(book.payment.verified_at)}</dd></div>}
                {book.payment.rejection_reason && <p className="mt-1 rounded-lg bg-red-50 p-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">Ditolak: {book.payment.rejection_reason}</p>}
              </dl>
            )}
            <div className="mt-3 flex justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-zinc-400">ISBN</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{book.isbn || 'Belum diterbitkan'}</span>
            </div>
          </div>
        </section>

        {/* Timeline riwayat status */}
        <section className="rounded-xl border border-zinc-200 bg-white shadow-subtle dark:border-zinc-800 dark:bg-zinc-900" aria-label="Riwayat status">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <History className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Jejak Aktivitas</h2>
          </div>
          {(book.history || []).length === 0 ? (
            <p className="px-5 py-6 text-xs text-zinc-400">Belum ada aktivitas tercatat.</p>
          ) : (
            <ol className="relative ml-8 space-y-4 border-l border-zinc-200 px-5 py-4 dark:border-zinc-700">
              {book.history!.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[26.5px] top-1 h-2 w-2 rounded-full bg-[#1E6F3D]" />
                  <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                    {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {h.actor_name || 'Sistem'} · {formatDate(h.created_at)}
                  </p>
                  {h.notes && <p className="mt-0.5 text-[11px] text-zinc-500">{h.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Modal revisi */}
      <Modal open={revOpen} onClose={() => setRevOpen(false)} title="Unggah Naskah Revisi">
        <div className="space-y-4">
          <Field label="Berkas Revisi (PDF/DOCX, maks. 20MB)" hint="Diunggah sebagai versi berikutnya — versi lama tetap tersimpan.">
            <input type="file" accept=".pdf,.docx,.doc" onChange={(e) => setRevFile(e.target.files?.[0] || null)} className={inputClass} />
          </Field>
          <Field label="Catatan Revisi (opsional)">
            <textarea value={revNotes} onChange={(e) => setRevNotes(e.target.value)} rows={3} className={inputClass} placeholder="Ringkasan perubahan yang dilakukan..." />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setRevOpen(false)}>Batal</GhostButton>
            <PrimaryButton disabled={!revFile || submitting} onClick={() => void submitRevision()}>
              {submitting ? 'Mengunggah...' : 'Unggah Revisi'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Modal bukti bayar */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Unggah Bukti Pembayaran">
        <div className="space-y-4">
          <p className="rounded-lg bg-[#EAF5EE] p-3 text-xs leading-relaxed text-[#143823] dark:bg-[#143823]/60 dark:text-[#EAF5EE]">
            Biaya penerbitan LPPM Press: <strong>{formatRupiah(1500000)}</strong>. Transfer ke rekening resmi LPPM UPN Veteran Jakarta, lalu unggah bukti transfer di sini.
          </p>
          <Field label="Nominal yang Ditransfer (Rp)">
            <input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Bukti Transfer (JPG/PNG/PDF, maks. 5MB)">
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setPayFile(e.target.files?.[0] || null)} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setPayOpen(false)}>Batal</GhostButton>
            <PrimaryButton disabled={!payFile || submitting} onClick={() => void submitPayment()}>
              {submitting ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
