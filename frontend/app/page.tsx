'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';
import { BookOpen, GraduationCap, Users, Zap, Shield, Bell } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'teacher') router.replace('/teacher');
      else router.replace('/student');
    }
  }, [user]);

  const features = [
    { icon: BookOpen, title: 'Submit Questions', desc: 'Students submit academic questions in any subject.', color: '#6366f1' },
    { icon: GraduationCap, title: 'Expert Teachers', desc: 'Qualified teachers provide verified, detailed answers.', color: '#8b5cf6' },
    { icon: Zap, title: 'Real-time Notifications', desc: 'Get instantly notified when your question is answered.', color: '#06b6d4' },
    { icon: Bell, title: 'Smart Search', desc: 'Full-text search across all Q&A for instant knowledge.', color: '#10b981' },
    { icon: Shield, title: 'Secure & Private', desc: 'Enterprise-grade security with JWT + RBAC protection.', color: '#f59e0b' },
    { icon: Users, title: 'Multi-role System', desc: 'Separate dashboards for students, teachers, and admins.', color: '#ef4444' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--gradient-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'white' }}>E</div>
          <span style={{ fontWeight: 800, fontSize: 18, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EduQ&A</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/login" className="btn btn-ghost">Sign In</Link>
          <Link href="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '100px 40px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow background */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', width: 700, height: 700, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 40, padding: '6px 16px', fontSize: 13, color: 'var(--primary-light)', marginBottom: 28, fontWeight: 600 }}>
            ✨ Connecting students with expert teachers
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Academic Questions,{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Expert Answers
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Submit your academic questions and receive detailed answers from qualified teachers. Real-time notifications, file attachments, and smart search included.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary btn-lg" style={{ minWidth: 160 }}>
              Start for Free →
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg" style={{ minWidth: 140 }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 40px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Everything you need</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, marginBottom: 48 }}>A complete platform built for modern learning</p>

        <div className="grid-3">
          {features.map((f) => (
            <div key={f.title} className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${f.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <f.icon size={24} style={{ color: f.color }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        margin: '0 40px 80px',
        padding: '60px 40px',
        background: 'var(--gradient-primary)',
        borderRadius: 'var(--radius-xl)',
        textAlign: 'center',
        maxWidth: 800,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: 'white' }}>Ready to start learning?</h2>
        <p style={{ fontSize: 15, marginBottom: 32, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
          Join thousands of students getting expert academic help. Redeem your prepaid code and submit your first question today.
        </p>
        <Link href="/register" className="btn btn-lg" style={{ background: 'white', color: '#6366f1', fontWeight: 700 }}>
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        © {new Date().getFullYear()} EduQ&A. All rights reserved. Built with ❤️ for education.
      </footer>
    </div>
  );
}
