import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-token
 * Called by the frontend after login or OAuth callback to set the
 * accessToken cookie on the Vercel domain (vercel.app).
 *
 * The middleware reads this cookie for auth checks. It cannot read
 * cookies set by the Render backend (different domain).
 */
export async function POST(request: NextRequest) {
  const { token, refreshToken } = await request.json();

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  // Set accessToken cookie (30 days)
  response.cookies.set('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  // Set refreshToken cookie (90 days)
  if (refreshToken && typeof refreshToken === 'string') {
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    });
  }

  return response;
}

/**
 * DELETE /api/auth/set-token
 * Clears the auth cookies on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('accessToken');
  response.cookies.delete('refreshToken');
  return response;
}
