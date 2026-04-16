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
  const { token } = await request.json();

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  // Set the cookie on this domain (vercel.app) so the middleware can read it
  response.cookies.set('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Same-site since it's all on vercel.app
    maxAge: 15 * 60, // 15 minutes (matches backend JWT expiry)
    path: '/',
  });

  return response;
}

/**
 * DELETE /api/auth/set-token
 * Clears the accessToken cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('accessToken');
  return response;
}
