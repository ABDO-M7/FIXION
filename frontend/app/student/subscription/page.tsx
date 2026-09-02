'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { subscriptionsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Key, CheckCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<{ code: string }>();
  const code = watch('code') || '';
  const { t } = useTranslation();

  const fetchStatus = async () => {
    try {
      const res = await subscriptionsApi.status();
      setSub(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const onRedeem = async (data: { code: string }) => {
    setRedeeming(true);
    try {
      await subscriptionsApi.redeem(data.code.trim().toUpperCase());
      toast.success(t('subscription.redeemSuccess'));
      reset();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('subscription.invalidCode'));
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('subscription.title')}</h1>
          <p className="page-subtitle">{t('subscription.subtitle')}</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Current Status */}
        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : (
          <div className="card" style={{
            background: sub?.isActive
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.05))',
            border: `1px solid ${sub?.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: sub?.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sub?.isActive
                  ? <CheckCircle size={26} style={{ color: 'var(--success)' }} />
                  : <Key size={26} style={{ color: 'var(--danger)' }} />}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  {sub?.isActive ? t('subscription.active') : t('subscription.inactive')}
                </div>
                {sub?.isActive ? (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={13} /> {t('subscription.plan')} <strong style={{ textTransform: 'capitalize' }}>{sub.plan}</strong>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} /> {sub.daysLeft} {sub.daysLeft !== 1 ? t('subscription.days') : t('subscription.day')} {t('subscription.remaining')}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t('subscription.redeemForFeatures')}
                  </div>
                )}
              </div>
            </div>

            {sub?.isActive && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('subscription.expiresOn')}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {new Date(sub.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('subscription.progress')}
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (sub.daysLeft / (sub.plan === 'weekly' ? 7 : 30)) * 100)}%`,
                        background: 'var(--gradient-primary)',
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Redeem Code */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('subscription.redeemTitle')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {t('subscription.redeemDesc')}
          </p>

          <form onSubmit={handleSubmit(onRedeem)} style={{ display: 'flex', gap: 10 }}>
            <input
              {...register('code', { required: true })}
              className="form-input"
              placeholder={t('subscription.redeemPlaceholder')}
              style={{ flex: 1, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}
              maxLength={20}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={redeeming || code.trim().length < 6}
              style={{ flexShrink: 0 }}
            >
              {redeeming ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><ArrowRight size={15} /> {t('subscription.redeemBtn')}</>}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              💡 <strong>{t('subscription.howItWorks')}</strong> {t('subscription.howItWorksText')}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
