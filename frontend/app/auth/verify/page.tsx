'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import Link from 'next/link';

function VerifyContent() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    setStatus('loading');
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <>
      {(status === 'idle' || status === 'loading') && (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Loader size={30} style={{ color: 'var(--primary-light)', animation: 'spin 1s linear infinite' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verifying your email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Please wait while we verify your email address...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={30} style={{ color: 'var(--success)' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Email verified!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>Your email has been successfully verified. You can now sign in.</p>
          <Link href="/login" className="btn btn-primary btn-lg">Sign In Now →</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <XCircle size={30} style={{ color: 'var(--danger)' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verification failed</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
            {!token ? 'No verification token in URL.' : 'Link is invalid or expired. Please register again.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary">Register Again</Link>
            <Link href="/login" className="btn btn-secondary">Sign In</Link>
          </div>
        </>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '64px 40px' }}>
        <div className="auth-logo" style={{ marginBottom: 24 }}>
          <div className="auth-logo-icon">E</div>
        </div>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
