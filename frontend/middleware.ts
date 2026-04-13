import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes and their allowed roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/student': ['student'],
  '/teacher': ['teacher', 'admin'],
  '/admin': ['admin'],
};

const PUBLIC_ROUTES = ['/login', '/register', '/auth/verify', '/auth/callback', '/'];

function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets
  if (
    PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;

  // No token → redirect to login
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode token (lightweight, no verification — verification happens on API)
  const payload = decodeJwtPayload(accessToken);

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check token expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    // Token expired — try to refresh via redirect
    const refreshUrl = new URL('/api/auth/refresh', request.url);
    refreshUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(refreshUrl);
  }

  const userRole: string = payload.role;

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        // Redirect to their correct dashboard
        const redirect = userRole === 'admin' ? '/admin' : userRole === 'teacher' ? '/teacher' : '/student';
        return NextResponse.redirect(new URL(redirect, request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
