'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', textAlign: 'center', padding: 24,
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 'clamp(80px, 20vw, 160px)', fontWeight: 800, lineHeight: 1, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 0.15 }}>
          404
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(80px, 20vw, 160px)' }}>
          🔍
        </div>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>Page not found</h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 360 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <Link href="/" className="btn btn-primary">Go Home</Link>
        <button onClick={() => history.back()} className="btn btn-secondary">← Go Back</button>
      </div>
    </div>
  );
}
