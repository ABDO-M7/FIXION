'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import Link from 'next/link';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    // After Google OAuth redirect, fetch the current user
    authApi.me()
      .then(res => {
        setUser(res.data);
        setStatus('success');
        const role = res.data.role;
        setTimeout(() => {
          router.push(role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');
        }, 1500);
      })
      .catch(() => {
        setStatus('error');
      });
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
