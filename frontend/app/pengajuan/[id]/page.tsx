'use client';

import { useParams } from 'next/navigation';
import { BookDetail } from '@/lib/book-detail';
import { DashboardShell } from '@/lib/shell';

export default function PengajuanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DashboardShell>
      <BookDetail bookId={id} backHref="/pengajuan" />
    </DashboardShell>
  );
}
