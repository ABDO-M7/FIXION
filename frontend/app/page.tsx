'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import {
  BookOpen, GraduationCap, Users, Zap, Shield, Bell,
  ChevronRight, Globe, Menu, X, Calendar, MessageSquare,
  BarChart2, Key, CheckCircle, Star, ArrowRight, Sparkles
} from 'lucide-react';
import Link from 'next/link';

/* ── Localisation ──────────────────────────────────── */
const dict = {
  en: {
    dir: 'ltr' as const,
    nav: { signin: 'Sign In', getStarted: 'Get Started' },
    badge: '✨ Egypt\'s #1 Academic Q&A Platform',
    heroTitle: ['Academic Questions,', 'Expert Answers'],
    heroHighlight: 'Expert Answers',
    heroSub: 'Submit your academic questions and get detailed answers from qualified teachers — with real-time notifications, appointments, and smart course management.',
    heroCta: 'Start for Free',
    heroSub2: 'Sign In',
    statsTitle: 'Trusted by students across Egypt',
    stats: [
      { value: '5,000+', label: 'Questions Answered' },
      { value: '200+', label: 'Expert Teachers' },
      { value: '15,000+', label: 'Students Enrolled' },
      { value: '98%', label: 'Satisfaction Rate' },
    ],
    featuresTitle: 'Everything you need to learn better',
    featuresSub: 'A complete academic platform built for modern Egyptian students',
    features: [
      { icon: MessageSquare, title: 'Ask Questions', desc: 'Submit detailed academic questions with file attachments in any subject.' },
      { icon: GraduationCap, title: 'Expert Teachers', desc: 'Qualified, verified teachers answer your questions with detailed explanations.' },
      { icon: Zap, title: 'Instant Notifications', desc: 'Get real-time alerts the moment your question receives an answer.' },
      { icon: Calendar, title: '1-on-1 Appointments', desc: 'Book personal explanation sessions with specialized teachers.' },
      { icon: BookOpen, title: 'Course Management', desc: 'Enroll in structured courses with organized lessons and materials.' },
      { icon: BarChart2, title: 'Grade Tracking', desc: 'View your quiz grades and assignment scores in a clear dashboard.' },
      { icon: Key, title: 'Prepaid Subscriptions', desc: 'Simple code-based subscription — no credit card needed.' },
      { icon: Shield, title: 'Secure & Private', desc: 'Enterprise-grade security with JWT auth and role-based access.' },
      { icon: Users, title: 'Multi-role System', desc: 'Dedicated dashboards for students, teachers, and admins.' },
    ],
    howTitle: 'How it works',
    howSub: 'Get started in three simple steps',
    steps: [
      { n: '01', title: 'Create your account', desc: 'Sign up for free and complete your profile in under a minute.' },
      { n: '02', title: 'Redeem your code', desc: 'Enter your prepaid subscription code to unlock unlimited questions.' },
      { n: '03', title: 'Ask & learn', desc: 'Submit questions, book appointments, and track your progress.' },
    ],
    ctaTitle: 'Ready to start learning?',
    ctaSub: 'Join thousands of students getting expert academic support. Redeem your prepaid code and submit your first question today.',
    ctaBtn: 'Create Free Account',
    footer: `© ${new Date().getFullYear()} Fixion. All rights reserved. Built with ❤️ for Egyptian students.`,
  },
  ar: {
    dir: 'rtl' as const,
    nav: { signin: 'تسجيل الدخول', getStarted: 'ابدأ الآن' },
    badge: '✨ منصة الأسئلة الأكاديمية الأولى في مصر',
    heroTitle: ['أسئلتك الأكاديمية،', 'إجابات من خبراء'],
    heroHighlight: 'إجابات من خبراء',
    heroSub: 'أرسل أسئلتك الأكاديمية واحصل على إجابات تفصيلية من معلمين مؤهلين — مع إشعارات فورية، مواعيد شرح، وإدارة ذكية للدورات.',
    heroCta: 'ابدأ مجاناً',
    heroSub2: 'تسجيل الدخول',
    statsTitle: 'يثق بنا آلاف الطلاب في مصر',
    stats: [
      { value: '+5,000', label: 'سؤال تمت الإجابة عليه' },
      { value: '+200', label: 'معلم متخصص' },
      { value: '+15,000', label: 'طالب مسجّل' },
      { value: '98%', label: 'نسبة الرضا' },
    ],
    featuresTitle: 'كل ما تحتاجه للتعلم بشكل أفضل',
    featuresSub: 'منصة أكاديمية متكاملة مصممة للطلاب المصريين المعاصرين',
    features: [
      { icon: MessageSquare, title: 'اطرح أسئلتك', desc: 'أرسل أسئلة أكاديمية مفصّلة مع مرفقات في أي مادة.' },
      { icon: GraduationCap, title: 'معلمون خبراء', desc: 'معلمون مؤهلون ومعتمدون يجيبون على أسئلتك بشروح تفصيلية.' },
      { icon: Zap, title: 'إشعارات فورية', desc: 'احصل على تنبيهات في الوقت الفعلي لحظة الإجابة على سؤالك.' },
      { icon: Calendar, title: 'مواعيد فردية', desc: 'احجز جلسات شرح شخصية مع معلمين متخصصين في مادتك.' },
      { icon: BookOpen, title: 'إدارة الدورات', desc: 'سجّل في دورات منظّمة مع دروس ومواد منظّمة.' },
      { icon: BarChart2, title: 'تتبع الدرجات', desc: 'اطّلع على درجات اختباراتك ومهامك في لوحة تحكم واضحة.' },
      { icon: Key, title: 'اشتراكات مسبقة الدفع', desc: 'اشتراك بسيط عبر كود — بدون بطاقة بنكية.' },
      { icon: Shield, title: 'آمن وخاص', desc: 'أمان على مستوى المؤسسات مع JWT وصلاحيات مبنية على الأدوار.' },
      { icon: Users, title: 'نظام متعدد الأدوار', desc: 'لوحات تحكم مخصصة للطلاب والمعلمين والإداريين.' },
    ],
    howTitle: 'كيف يعمل',
    howSub: 'ابدأ في ثلاث خطوات بسيطة',
    steps: [
      { n: '01', title: 'أنشئ حسابك', desc: 'سجّل مجاناً وأكمل ملفك الشخصي في أقل من دقيقة.' },
      { n: '02', title: 'استرد كودك', desc: 'أدخل كود الاشتراك المدفوع مسبقاً لفتح أسئلة غير محدودة.' },
      { n: '03', title: 'اسأل وتعلّم', desc: 'أرسل أسئلتك، احجز مواعيد، وتابع تقدمك الأكاديمي.' },
    ],
    ctaTitle: 'هل أنت مستعد للبدء؟',
    ctaSub: 'انضم إلى آلاف الطلاب الذين يحصلون على دعم أكاديمي متخصص. استرد كودك المدفوع مسبقاً وأرسل سؤالك الأول اليوم.',
    ctaBtn: 'أنشئ حساباً مجانياً',
    footer: `© ${new Date().getFullYear()} فيكسيون. جميع الحقوق محفوظة. صُنع بـ ❤️ للطلاب المصريين.`,
  },
};

const FEATURE_COLORS = ['#3b82f6','#8b5cf6','#0ea5e9','#14b8a6','#1d4ed8','#f59e0b','#10b981','#ef4444','#06b6d4'];

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = dict[lang];

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'teacher') router.replace('/teacher');
      else router.replace('/student');
    }
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }} dir={t.dir}>

      {/* ── LIQUID GLASS NAVBAR ──────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)', maxWidth: 1100,
        zIndex: 200,
        background: scrolled ? 'rgba(5,12,26,0.75)' : 'rgba(5,12,26,0.55)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 20,
        padding: '0 24px',
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.jpg" alt="Fixion" style={{ height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(30,58,138,0.6))' }} />
          <span style={{ fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg, #f0f6ff 0%, #7dd3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Fixion</span>
        </div>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 50, padding: '6px 14px', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as any).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as any).style.color = 'var(--text-secondary)'; }}
          >
            <Globe size={13} />
            {lang === 'en' ? 'عربي' : 'English'}
          </button>

          <Link href="/login" style={{ padding: '8px 18px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', borderRadius: 10, transition: 'all 0.2s', border: '1px solid transparent' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            {t.nav.signin}
          </Link>
          <Link href="/register" style={{
            padding: '9px 20px', fontSize: 13.5, fontWeight: 700, color: 'white',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
            borderRadius: 10, border: '1px solid rgba(59,130,246,0.4)',
            boxShadow: '0 4px 16px rgba(30,58,138,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(30,58,138,0.65), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,58,138,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'; }}>
            {t.nav.getStarted}
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ padding: '160px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden', maxWidth: 1100, margin: '0 auto' }}>
        {/* ambient glows */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 600, background: 'radial-gradient(ellipse, rgba(30,58,138,0.2) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '5%', width: 350, height: 350, background: 'radial-gradient(ellipse, rgba(14,165,233,0.1) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(30,58,138,0.15)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 40,
            padding: '8px 20px', fontSize: 13, color: '#93c5fd',
            marginBottom: 32, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(30,58,138,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
            {t.badge}
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-2px' }}>
            {t.heroTitle[0]}<br />
            <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 50%, #14b8a6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t.heroTitle[1]}
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 44px', lineHeight: 1.75 }}>
            {t.heroSub}
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 36px', fontSize: 16, fontWeight: 700, color: 'white',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
              borderRadius: 14, border: '1px solid rgba(59,130,246,0.4)',
              boxShadow: '0 6px 32px rgba(30,58,138,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'all 0.25s',
            }}
              onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(30,58,138,0.7), inset 0 1px 0 rgba(255,255,255,0.25)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(30,58,138,0.55), inset 0 1px 0 rgba(255,255,255,0.2)'; }}>
              {t.heroCta} <ArrowRight size={18} />
            </Link>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
              borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'all 0.25s',
            }}
              onMouseEnter={(e: any) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}>
              {t.heroSub2}
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
          padding: '36px 48px', display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)' }} />
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{t.statsTitle}</p>
          {t.stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, letterSpacing: '-1px', background: 'linear-gradient(135deg, #f0f6ff 0%, #93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 14 }}>
            {t.featuresTitle}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>{t.featuresSub}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {t.features.map((f, i) => {
            const Icon = f.icon;
            const color = FEATURE_COLORS[i % FEATURE_COLORS.length];
            return (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18,
                padding: '28px 24px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.25s',
                cursor: 'default',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px ${color}30`; el.style.borderColor = `${color}40`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)'; el.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={24} style={{ color }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12 }}>{t.howTitle}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 56 }}>{t.howSub}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, position: 'relative' }}>
          {/* connector line */}
          <div style={{ position: 'absolute', top: 40, left: '17%', right: '17%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(14,165,233,0.4), transparent)', pointerEvents: 'none' }} />
          {t.steps.map((s, i) => (
            <div key={s.n} style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '32px 24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
              position: 'relative',
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 15, fontWeight: 800, color: 'white',
                boxShadow: '0 4px 16px rgba(30,58,138,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                border: '2px solid rgba(59,130,246,0.3)',
              }}>
                {s.n}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,58,138,0.5) 0%, rgba(8,145,178,0.4) 100%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(59,130,246,0.35)',
          borderRadius: 24, padding: '72px 56px', textAlign: 'center',
          boxShadow: '0 12px 60px rgba(30,58,138,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
          <div style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(14,165,233,0.2) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
          <Sparkles size={36} style={{ color: '#93c5fd', margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-1px' }}>{t.ctaTitle}</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 40, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>{t.ctaSub}</p>
          <Link href="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '15px 40px', fontSize: 16, fontWeight: 700, color: '#1e3a8a',
            background: 'white', borderRadius: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: 'all 0.25s',
          }}
            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; }}>
            {t.ctaBtn} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{
        padding: '32px 40px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          <img src="/logo.jpg" alt="Fixion" style={{ height: 28, objectFit: 'contain', opacity: 0.7 }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)' }}>Fixion</span>
        </div>
        {t.footer}
      </footer>

      {/* Mobile responsive stats */}
      <style>{`
        @media (max-width: 768px) {
          section div[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          section div[style*="repeat(3"] { grid-template-columns: 1fr !important; }
          nav { top: 8px !important; width: calc(100% - 24px) !important; border-radius: 16px !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </div>
  );
}
