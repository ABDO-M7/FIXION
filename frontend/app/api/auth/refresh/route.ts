import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/';

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PRIMARY || 'https://fixion.onrender.com/api/v1';
    const cookieHeader = request.headers.get('cookie') || '';
    const refreshToken = request.cookies.get('refreshToken')?.value;

    const res = await fetch(`${backendUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const response = NextResponse.redirect(new URL(redirect, request.url));

      if (data?.accessToken) {
        response.cookies.set('accessToken', data.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }

      if (data?.refreshToken) {
        response.cookies.set('refreshToken', data.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 90 * 24 * 60 * 60,
          path: '/',
        });
      }

      // Forward Set-Cookie headers from backend if present
      const setCookie = res.headers.getSetCookie?.() || [];
      setCookie.forEach(c => response.headers.append('Set-Cookie', c));
      return response;
    }
  } catch {}

  return NextResponse.redirect(new URL('/login', request.url));
}
