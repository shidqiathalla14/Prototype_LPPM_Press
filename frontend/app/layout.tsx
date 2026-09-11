import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { brand } from '@/lib/config/brand';
import './globals.css';

export const metadata: Metadata = {
  title: `${brand.name} ${brand.institution}`,
  description: brand.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning> 
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
