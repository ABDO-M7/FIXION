'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Globe } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  level: z.string().min(1, 'Please select your level'),
  phone: z.string().regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number'),
});

type FormData = z.infer<typeof schema>;

const strings = {
  en: {
    title: 'Create your account',
    sub: 'Start learning with expert teacher support',
    name: 'Full Name', namePh: 'Your full name',
    email: 'Email Address',
    password: 'Password', passPh: 'Min. 8 characters',
    phone: 'Phone Number', phonePh: '+20 1XX XXX XXXX',
    level: 'School Level', levelPh: 'Select your level...',
    l1: 'Level 1', l2: 'Level 2', l3: 'Level 3',
    submit: 'Create Account',
    orWith: 'or continue with',
    google: 'Continue with Google',
    hasAccount: 'Already have an account?',
    signin: 'Sign in',
  },
  ar: {
    title: 'أنشئ حسابك',
    sub: 'ابدأ رحلتك التعليمية مع دعم المعلمين المتخصصين',
    name: 'الاسم الكامل', namePh: 'اسمك الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور', passPh: '8 أحرف على الأقل',
    phone: 'رقم الهاتف', phonePh: '+20 1XX XXX XXXX',
    level: 'المستوى الدراسي', levelPh: 'اختر مستواك...',
    l1: 'المستوى الأول', l2: 'المستوى الثاني', l3: 'المستوى الثالث',
    submit: 'إنشاء حساب',
    orWith: 'أو تابع بـ',
    google: 'المتابعة بـ Google',
    hasAccount: 'لديك حساب بالفعل؟',
    signin: 'سجّل دخولك',
  },
};

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const router = useRouter();
  const t = strings[lang];
  const isRtl = lang === 'ar';

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authApi.register(data);
      toast.success('Account created! Please check your email to verify.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const iconStyle = (side: 'left' | 'right') => ({
    position: 'absolute' as const,
    [isRtl ? (side === 'left' ? 'right' : 'left') : side]: 12,
    top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  });

  return (
    <div className="auth-container" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Floating orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(30,58,138,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(14,165,233,0.1) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Language Toggle */}
      <button
        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        style={{
          position: 'absolute', top: 24, right: 24, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-pill)',
          padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
          cursor: 'pointer', transition: 'var(--transition)',
        }}
      >
        <Globe size={14} />
        {lang === 'en' ? 'عربي' : 'English'}
      </button>

      <div className="auth-card animate-fade-in-up" style={{ maxWidth: 500 }}>
        {/* Logo */}
        <div className="auth-logo">
          <img src="/logo.jpg" alt="Fixion" className="auth-logo-img" />
        </div>

        <h1 className="auth-title">{t.title}</h1>
        <p className="auth-subtitle">{t.sub}</p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">{t.name}</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={iconStyle('left')} />
              <input {...register('name')} className={`form-input ${errors.name ? 'error' : ''}`} placeholder={t.namePh} style={{ paddingLeft: isRtl ? 14 : 38, paddingRight: isRtl ? 38 : 14 }} />
            </div>
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.email}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={iconStyle('left')} />
              <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="your@email.com" style={{ paddingLeft: isRtl ? 14 : 38, paddingRight: isRtl ? 38 : 14 }} />
            </div>
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.password}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={iconStyle('left')} />
              <input {...register('password')} type={showPass ? 'text' : 'password'} className={`form-input ${errors.password ? 'error' : ''}`} placeholder={t.passPh} style={{ paddingLeft: isRtl ? 40 : 38, paddingRight: isRtl ? 38 : 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: isRtl ? 'auto' : 12, left: isRtl ? 12 : 'auto', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.phone}</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={iconStyle('left')} />
              <input {...register('phone')} type="tel" className={`form-input ${errors.phone ? 'error' : ''}`} placeholder={t.phonePh} style={{ paddingLeft: isRtl ? 14 : 38, paddingRight: isRtl ? 38 : 14 }} />
            </div>
            {errors.phone && <span className="form-error">{errors.phone.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t.level}</label>
            <select {...register('level')} className={`form-input ${errors.level ? 'error' : ''}`} defaultValue="">
              <option value="" disabled>{t.levelPh}</option>
              <option value="Level 1">{t.l1}</option>
              <option value="Level 2">{t.l2}</option>
              <option value="Level 3">{t.l3}</option>
            </select>
            {errors.level && <span className="form-error">{errors.level.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading} style={{ marginTop: 6 }}>
            {isLoading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <>{t.submit} <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="auth-divider">{t.orWith}</div>

        <button onClick={() => authApi.googleLogin()} className="btn btn-secondary btn-full" style={{ gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t.google}
        </button>

        <p className="auth-footer">
          {t.hasAccount}{' '}
          <Link href="/login" className="auth-link">{t.signin}</Link>
        </p>
      </div>
    </div>
  );
}
