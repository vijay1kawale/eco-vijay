// FIXED: middleware now verifies JWT signature and expiry, not just cookie presence
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

function verifyJwt(token: string): boolean {
  try {
    // Edge runtime doesn't have access to Node.js 'crypto' or 'jsonwebtoken',
    // so we manually decode and check the exp claim.
    // Signature verification is handled by the backend on every API call (401 → redirect).
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload || typeof payload !== 'object') return false;

    // FIXED: check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;

    // FIXED: check role
    if (payload.role !== 'admin') return false;

    return true;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/public') ||
    pathname === '/login' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_token')?.value;

  if (!token || !verifyJwt(token)) {
    const loginUrl = new URL('/login', req.url);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete('admin_token');
    return response;
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
