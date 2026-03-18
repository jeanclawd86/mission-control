import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function expectedCookieValue(password: string): string {
  return createHmac('sha256', password).update('mc_auth_token').digest('hex');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /login, /api/*, and static assets through
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const password = process.env.MC_SITE_PASSWORD;
  if (!password) {
    // No password configured — allow through
    return NextResponse.next();
  }

  const cookie = request.cookies.get('mc_auth')?.value;
  if (cookie && cookie === expectedCookieValue(password)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
