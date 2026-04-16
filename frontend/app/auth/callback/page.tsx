'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import Link from 'next/link';

function AuthCallbackInner() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Read the access token passed in the redirect URL from the backend
    const token = searchParams.get('token');

    const initialize = async () => {
      if (token) {
        // Store in localStorage for api.ts Bearer header
        localStorage.setItem('accessToken', token);

        // Set cookie on Vercel's own domain so middleware can authenticate requests
        await fetch('/api/auth/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      }

      // Fetch current user — api.ts will attach token from localStorage as Bearer
      try {
        const res = await authApi.me();
        setUser(res.data);
        setStatus('success');
        const role = res.data.role;
        setTimeout(() => {
          router.push(role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');
        }, 1500);
      } catch {
        setStatus('error');
      }
    };

    initialize();
  }, []);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        {status === 'loading' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Loader size={28} style={{ color: 'var(--primary-light)', animation: 'spin 1s linear infinite' }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Signing you in...</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Setting up your account, please wait.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={28} style={{ color: 'var(--success)' }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Welcome!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Login successful. Redirecting to your dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <XCircle size={28} style={{ color: 'var(--danger)' }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Authentication failed</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              We couldn't complete the sign-in. Please try again.
            </p>
            <Link href="/login" className="btn btn-primary">Try Again</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Loader size={28} style={{ color: 'var(--primary-light)', animation: 'spin 1s linear infinite' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Signing you in...</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Setting up your account, please wait.</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
