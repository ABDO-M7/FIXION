'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Phone, GraduationCap, ArrowRight, Loader } from 'lucide-react';
import Image from 'next/image';

const schema = z.object({
  phone: z.string().regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number'),
  level: z.string().optional(),
}).superRefine((data, ctx) => {
  // If no level provided, and role is student (which we'll check outside), it's bad.
  // We'll just enforce it in UI.
});

type FormData = z.infer<typeof schema>;

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // If they already have all data, send them to dashboard
    if (user && user.phone && (user.role !== 'student' || user.level)) {
      const role = user.role;
      router.push(role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <Loader size={30} className="spinner" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    if (user.role === 'student' && (!data.level || data.level === '')) {
      toast.error('Please select your school level.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.updateProfile({
        phone: data.phone,
        level: user.role === 'student' ? data.level : undefined,
      });
      setUser(res.data);
      toast.success('Profile completed!');
      router.push(user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student');
    } catch (err: any) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <Image src="/logo.png" alt="Fixion" width={40} height={40} style={{ borderRadius: 10 }} />
          <span style={{ fontSize: 22, fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fixion
          </span>
        </div>

        <h1 className="auth-title">Almost there!</h1>
        <p className="auth-subtitle">Please complete your profile to continue</p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                {...register('phone')}
                type="tel"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="+20 1XX XXX XXXX"
                style={{ paddingLeft: 36 }}
              />
            </div>
            {errors.phone && <span className="form-error">{errors.phone.message}</span>}
          </div>

          {user.role === 'student' && (
            <div className="form-group">
              <label className="form-label">School Level</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  {...register('level')}
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  defaultValue=""
                >
                  <option value="" disabled>Select your level...</option>
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                  <option value="Level 3">Level 3</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading} style={{ marginTop: 8 }}>
            {isLoading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <>Continue to Dashboard <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
