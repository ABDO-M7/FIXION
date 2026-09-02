'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { questionsApi, subscriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import { HelpCircle, CheckCircle, Clock, Key, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      questionsApi.myQuestions(1, 5),
      subscriptionsApi.status(),
    ]).then(([qRes, sRes]) => {
      setQuestions(qRes.data.data || []);
      setSubscription(sRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pending = questions.filter(q => q.status === 'pending').length;
  const answered = questions.filter(q => q.status === 'answered').length;

  const statusBadge = (status: string) => {
    if (status === 'answered') return <span className="badge badge-answered">✓ {t('dashboard.student.answered')}</span>;
    if (status === 'pending') return <span className="badge badge-pending">⏳ {t('dashboard.student.pending')}</span>;
    return <span className="badge badge-closed">{t('dashboard.student.closed')}</span>;
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('common.welcomeBack')}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{t('common.overview')}</p>
        </div>
        <Link href="/student/questions/new" className="btn btn-primary">
          <Plus size={16} /> {t('common.askQuestion')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <HelpCircle size={22} style={{ color: 'var(--primary-light)' }} />
          </div>
          <div className="stat-value">{questions.length}</div>
          <div className="stat-label">{t('dashboard.student.totalQuestions')}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle size={22} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-value">{answered}</div>
          <div className="stat-label">{t('dashboard.student.answered')}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Clock size={22} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-value">{pending}</div>
          <div className="stat-label">{t('dashboard.student.pending')}</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ background: subscription?.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
            <Key size={22} style={{ color: subscription?.isActive ? 'var(--success)' : 'var(--danger)' }} />
          </div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {subscription?.isActive ? `${subscription.daysLeft}${t('common.days')}` : t('common.none')}
          </div>
          <div className="stat-label">{t('dashboard.student.subscriptionLeft')}</div>
        </div>
      </div>

      {/* Subscription Alert */}
      {!subscription?.isActive && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>{t('dashboard.student.noSubscription')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('dashboard.student.redeemSubText')}
            </div>
          </div>
          <Link href="/student/subscription" className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', flexShrink: 0 }}>
            {t('dashboard.student.redeemCode')}
          </Link>
        </div>
      )}

      {/* Recent Questions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t('dashboard.student.recentQuestions')}</h2>
          <Link href="/student/questions" className="btn btn-ghost btn-sm">
            {t('common.viewAll')} <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">{t('dashboard.student.noQuestions')}</div>
            <div className="empty-state-text">{t('dashboard.student.askFirstPrompt')}</div>
            <Link href="/student/questions/new" className="btn btn-primary" style={{ marginTop: 12 }}>
              <Plus size={15} /> {t('common.askFirstQuestion')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q) => (
              <Link key={q.id} href={`/student/questions/${q.id}`} className={`question-card ${q.status}`}>
                <div className="question-meta">
                  {statusBadge(q.status)}
                  {q.category && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      📚 {q.category.subject} › {q.category.chapter}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="question-excerpt">{q.content.length > 120 ? q.content.slice(0, 120) + '…' : q.content}</p>
                {q.answers?.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--success)' }}>
                    💬 {q.answers.length} {q.answers.length > 1 ? t('dashboard.student.answersPlural') : t('dashboard.student.answers')}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
