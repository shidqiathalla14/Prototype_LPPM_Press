import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/pengajuan', '/booklist', '/manajemen-buku', '/profile', '/settings'];
const ROLE_ROUTES: Record<string, string[]> = {
  '/pengajuan': ['AUTHOR', 'LPPM'],
  '/booklist': ['REVIEWER', 'EDITOR'],
  '/manajemen-buku': ['LPPM'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) return NextResponse.next();

  const authed = req.cookies.get('lppm_auth')?.value === '1';
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  const role = req.cookies.get('lppm_role')?.value || '';
  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      if (!allowed.includes(role)) {
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/pengajuan/:path*', '/booklist/:path*', '/manajemen-buku/:path*', '/profile/:path*', '/settings/:path*'],
};
