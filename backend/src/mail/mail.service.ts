import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface MailContext {
  recipientName: string;
  bookTitle?: string;
  notes?: string;
  actionUrl?: string;
  extraLines?: string[];
}

/**
 * Layanan email transaksional LPPM Press.
 * Jika SMTP tidak dikonfigurasi (development), email dicatat ke console log
 * alih-alih dikirim — proses bisnis tidak pernah gagal karena email.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const smtp = this.config.get<{ host: string; port: number; user: string; pass: string; from: string }>('smtp')!;
    this.from = smtp.from;
    this.appUrl = this.config.get<string>('appUrl')!;
    if (smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
    }
  }

  private html(subject: string, ctx: MailContext): string {
    const lines = (ctx.extraLines || []).map((l) => `<p style="margin:0 0 8px">${l}</p>`).join('');
    const notes = ctx.notes
      ? `<div style="margin:16px 0;padding:12px 16px;background:#EAF5EE;border-left:3px solid #1E6F3D;border-radius:6px"><p style="margin:0;font-size:13px;color:#143823"><strong>Catatan:</strong><br>${ctx.notes}</p></div>`
      : '';
    const cta = ctx.actionUrl
      ? `<a href="${this.appUrl}${ctx.actionUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1E6F3D;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Buka Sistem LPPM Press</a>`
      : '';
    return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#fafafa;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
  <div style="background:#143823;padding:16px 24px"><span style="color:#D4E100;font-weight:bold;font-size:15px">LPPM Press</span> <span style="color:#ffffff;font-size:13px">UPN Veteran Jakarta</span></div>
  <div style="padding:24px">
    <h2 style="margin:0 0 12px;font-size:17px;color:#09090b">${subject}</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#52525b">Yth. ${ctx.recipientName},</p>
    ${ctx.bookTitle ? `<p style="margin:0 0 8px;font-size:14px;color:#52525b">Naskah: <strong style="color:#09090b">&ldquo;${ctx.bookTitle}&rdquo;</strong></p>` : ''}
    ${lines}${notes}${cta}
  </div>
  <div style="padding:14px 24px;border-top:1px solid #e4e4e7;font-size:11px;color:#a1a1aa">Email otomatis — mohon tidak membalas. LPPM UPN Veteran Jakarta, Jl. RS Fatmawati, Pondok Labu, Jakarta Selatan.</div>
</div></body></html>`;
  }

  private async send(to: string, subject: string, ctx: MailContext) {
    try {
      if (!this.transporter) {
        this.logger.log(`[MAIL:DEV] Kepada ${to} | Subjek: ${subject}`);
        return;
      }
      await this.transporter.sendMail({ from: this.from, to, subject: `[LPPM Press] ${subject}`, html: this.html(subject, ctx) });
    } catch (e) {
      this.logger.error(`Gagal mengirim email ke ${to}: ${(e as Error).message}`);
    }
  }

  assigned(to: string, name: string, bookTitle: string, roleLabel: string) {
    return this.send(to, 'Tugas Baru Penelaahan Naskah LPPM-Press', {
      recipientName: name, bookTitle,
      extraLines: [`Anda ditugaskan sebagai <strong>${roleLabel}</strong> untuk naskah berikut. Silakan masuk ke menu Booklist untuk memulai penelaahan.`],
      actionUrl: '/booklist',
    });
  }

  revisionRequested(to: string, name: string, bookTitle: string, notes: string, fromEditor: boolean) {
    return this.send(to, fromEditor ? 'Naskah Memerlukan Perbaikan Tata Bahasa' : 'Naskah Memerlukan Perbaikan Reviewer', {
      recipientName: name, bookTitle, notes,
      extraLines: ['Silakan unggah dokumen revisi (versi berikutnya) melalui halaman detail pengajuan Anda.'],
      actionUrl: '/pengajuan',
    });
  }

  revisionUploaded(to: string, name: string, bookTitle: string, version: number) {
    return this.send(to, 'Naskah Revisi Baru Telah Diunggah', {
      recipientName: name, bookTitle,
      extraLines: [`Penulis telah mengunggah naskah versi <strong>v${version}</strong>. Silakan lanjutkan penelaahan melalui menu Booklist.`],
      actionUrl: '/booklist',
    });
  }

  paymentRequired(to: string, name: string, bookTitle: string, amount: number) {
    return this.send(to, 'Tagihan Biaya Penerbitan Buku (Draf Final)', {
      recipientName: name, bookTitle,
      extraLines: [
        'Draf naskah Anda telah disetujui editor dan <strong>dinyatakan FINAL (terkunci)</strong>.',
        `Biaya penerbitan: <strong>Rp ${amount.toLocaleString('id-ID')}</strong>. Silakan lakukan transfer dan unggah bukti pembayaran.`,
      ],
      actionUrl: '/pengajuan',
    });
  }

  paymentVerified(to: string, name: string, bookTitle: string) {
    return this.send(to, 'Pembayaran Diterima - Pengajuan ISBN Berjalan', {
      recipientName: name, bookTitle,
      extraLines: ['Pembayaran Anda telah diverifikasi LPPM. Naskah kini diproses untuk pengajuan ISBN ke Perpustakaan Nasional RI.'],
      actionUrl: '/pengajuan',
    });
  }

  paymentRejected(to: string, name: string, bookTitle: string, reason: string) {
    return this.send(to, 'Bukti Pembayaran Perlu Diperbaiki', {
      recipientName: name, bookTitle, notes: reason,
      extraLines: ['Mohon unggah ulang bukti pembayaran yang sesuai.'],
      actionUrl: '/pengajuan',
    });
  }

  isbnRejected(to: string, name: string, bookTitle: string, reason: string) {
    return this.send(to, 'Pengajuan ISBN Ditolak - Refund Diproses', {
      recipientName: name, bookTitle, notes: reason,
      extraLines: ['Pengajuan ISBN ditolak. Dana pembayaran akan dikembalikan oleh LPPM.'],
      actionUrl: '/pengajuan',
    });
  }

  refunded(to: string, name: string, bookTitle: string, amount: number, method: string, reference?: string) {
    return this.send(to, 'Pengembalian Dana Telah Diproses', {
      recipientName: name, bookTitle,
      extraLines: [
        `Dana sebesar <strong>Rp ${amount.toLocaleString('id-ID')}</strong> telah dikembalikan melalui <strong>${method}</strong>.`,
        ...(reference ? [`Referensi pengembalian: <strong>${reference}</strong>.`] : []),
      ],
      actionUrl: '/pengajuan',
    });
  }

  published(to: string, name: string, bookTitle: string, isbn: string) {
    return this.send(to, 'Selamat! Buku Anda Telah Resmi Diterbitkan', {
      recipientName: name, bookTitle,
      extraLines: [`Nomor ISBN resmi: <strong>${isbn}</strong>. Buku Anda kini tampil pada katalog publik LPPM Press.`],
      actionUrl: '/pengajuan',
    });
  }
}
