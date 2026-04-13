import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/';

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PRIMARY || 'http://localhost:3001/api/v1';
    const cookieHeader = request.headers.get('cookie') || '';

    const res = await fetch(`${backendUrl}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: cookieHeader },
      credentials: 'include',
    });

    if (res.ok) {
      const response = NextResponse.redirect(new URL(redirect, request.url));
      // Forward Set-Cookie headers from backend
      const setCookie = res.headers.getSetCookie?.() || [];
      setCookie.forEach(c => response.headers.append('Set-Cookie', c));
      return response;
    }
  } catch {}

  return NextResponse.redirect(new URL('/login', request.url));
}
