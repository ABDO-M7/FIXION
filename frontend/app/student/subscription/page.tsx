'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { subscriptionsApi, enrollmentsApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Key, CheckCircle, Calendar, Clock, ArrowRight, Timer, Camera, BookOpen, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';

type CodeType = 'timed' | 'snapshot' | 'chapter';

const CODE_TYPE_META: Record<CodeType, { label: string; color: string; Icon: any; description: string }> = {
  timed:    { label: 'Timed',    color: '#6366f1', Icon: Timer,    description: 'Access expires after the subscription period.' },
  snapshot: { label: 'Snapshot', color: '#10b981', Icon: Camera,   description: 'Access to content available at time of enrollment, forever.' },
  chapter:  { label: 'Chapter',  color: '#f59e0b', Icon: BookOpen, description: 'Access to selected chapters and lessons.' },
};

export default function SubscriptionPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<{ code: string }>();
  const code = watch('code') || '';
  const { t } = useTranslation();

  const fetchEnrollments = async () => {
    try {
      const res = await enrollmentsApi.my();
      setEnrollments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEnrollments(); }, []);

  const onRedeem = async (data: { code: string }) => {
    setRedeeming(true);
    try {
      await subscriptionsApi.redeem(data.code.trim().toUpperCase());
      toast.success(t('subscription.redeemSuccess'));
      reset();
      fetchEnrollments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('subscription.invalidCode'));
    } finally {
      setRedeeming(false);
    }
  };

  const now = new Date();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('subscription.title')}</h1>
          <p className="page-subtitle">{t('subscription.subtitle')}</p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

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
              maxLength={32}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={redeeming || code.trim().length < 4}
              style={{ flexShrink: 0 }}
            >
              {redeeming
                ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                : <><ArrowRight size={15} /> {t('subscription.redeemBtn')}</>}
            </button>
          </form>
        </div>

        {/* Enrollments */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>My Subscriptions</h2>

          {loading ? (
            <div className="page-loader"><span className="spinner" /></div>
          ) : enrollments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Key size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No active subscriptions. Redeem a code above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {enrollments.map(enrollment => {
                const codeType: CodeType = enrollment.codeType ?? 'timed';
                const meta = CODE_TYPE_META[codeType] ?? CODE_TYPE_META.timed;

                const hasDuration = (codeType === 'timed' || codeType === 'chapter') && Boolean(enrollment.expiresAt);
                const isExpired = hasDuration && new Date(enrollment.expiresAt) < now;
                const daysLeft = !isExpired && hasDuration
                  ? Math.ceil((new Date(enrollment.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={enrollment.id}
                    className="card"
                    style={{
                      border: `1px solid ${isExpired ? 'rgba(239,68,68,0.25)' : `${meta.color}33`}`,
                      background: isExpired
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.04), transparent)'
                        : `linear-gradient(135deg, ${meta.color}0a, transparent)`,
                      opacity: isExpired ? 0.7 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                      {/* Type icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: `${meta.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <meta.Icon size={22} style={{ color: meta.color }} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{enrollment.courseName}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                            background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40`,
                          }}>
                            {meta.label}
                          </span>
                          {isExpired && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={10} /> Expired
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {enrollment.groupName && <span style={{ marginRight: 10 }}>Group: {enrollment.groupName}</span>}
                          {enrollment.teacherName && <span>Teacher: {enrollment.teacherName}</span>}
                        </div>

                        {/* Status line by type */}
                        {codeType === 'timed' && (
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {enrollment.expiresAt && (
                              <span style={{ fontSize: 12, color: isExpired ? 'var(--danger)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={12} />
                                {isExpired ? 'Expired' : 'Expires'}: {new Date(enrollment.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {!isExpired && daysLeft !== null && (
                              <span style={{ fontSize: 12, fontWeight: 600, color: daysLeft <= 3 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} />
                                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                              </span>
                            )}
                          </div>
                        )}

                        {codeType === 'snapshot' && enrollment.snapshotAt && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={12} style={{ color: meta.color }} />
                            Content available as of {new Date(enrollment.snapshotAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — permanent access
                          </div>
                        )}

                        {codeType === 'chapter' && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            <CheckCircle size={12} style={{ color: meta.color, display: 'inline', marginRight: 4 }} />
                            Access to:&nbsp;
                            {(enrollment.accessScope?.chapters || []).map((ch: string) => (
                              <span key={ch} style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 10, background: `${meta.color}18`, color: meta.color, marginRight: 4, marginBottom: 2 }}>{ch}</span>
                            ))}
                            {(enrollment.accessScope?.lessons || []).map((lesson: string | { chapterName: string; lessonName: string }) => {
                              const label = typeof lesson === 'string'
                                ? lesson
                                : `${lesson.chapterName} · ${lesson.lessonName}`;
                              return <span key={label} style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 10, background: `${meta.color}18`, color: meta.color, marginRight: 4, marginBottom: 2 }}>{label}</span>;
                            })}
                            <div style={{ marginTop: 5, color: isExpired ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {enrollment.expiresAt
                                ? `${isExpired ? 'Expired' : 'Access expires'}: ${new Date(enrollment.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${!isExpired && daysLeft !== null ? ` · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : ''}`
                                : 'Permanent access'}
                            </div>
                          </div>
                        )}

                        {/* Progress bar for timed */}
                        {hasDuration && !isExpired && enrollment.expiresAt && enrollment.createdAt && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, Math.max(0, (daysLeft ?? 0) / Math.ceil((new Date(enrollment.expiresAt).getTime() - new Date(enrollment.createdAt).getTime()) / 86400000) * 100))}%`,
                                background: daysLeft && daysLeft <= 3 ? 'var(--danger)' : daysLeft && daysLeft <= 7 ? 'var(--warning)' : `var(--gradient-primary)`,
                                borderRadius: 2,
                                transition: 'width 0.3s',
                              }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Go to course */}
                      {!isExpired && (
                        <Link
                          href={`/student/courses/${encodeURIComponent(enrollment.id)}`}
                          className="btn btn-secondary btn-sm"
                          style={{ flexShrink: 0, alignSelf: 'center' }}
                        >
                          View Course <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
