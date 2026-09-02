'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { questionsApi } from '@/lib/api';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/hooks/useTranslation';

const STATUS_FILTERS = ['all', 'pending', 'answered', 'closed'] as const;

export default function MyQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { t } = useTranslation();

  const LIMIT = 10;

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionsApi.myQuestions(page, LIMIT);
      setQuestions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, [page]);

  const filtered = questions.filter(q => {
    const matchStatus = status === 'all' || q.status === status;
    const matchSearch = !search || q.content.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusBadge = (s: string) => {
    if (s === 'answered') return <span className="badge badge-answered">✓ {t('status.answered')}</span>;
    if (s === 'pending') return <span className="badge badge-pending">⏳ {t('status.pending')}</span>;
    return <span className="badge badge-closed">{t('status.closed')}</span>;
  };

  const statusLabel = (s: string) => {
    if (s === 'all') return t('nav.allQuestions') === 'Questions' ? 'All' : 'الكل';
    if (s === 'pending') return t('status.pending');
    if (s === 'answered') return t('status.answered');
    if (s === 'closed') return t('status.closed');
    return s;
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('questions.title')}</h1>
          <p className="page-subtitle">{total} {t('questions.subtitle')}</p>
        </div>
        <Link href="/student/questions/new" className="btn btn-primary">
          <Plus size={15} /> {t('questions.askQuestion')}
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('questions.searchPlaceholder')}
          />
        </div>
        <div className="tabs" style={{ flex: 'none' }}>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              className={`tab-btn ${status === s ? 'active' : ''}`}
              onClick={() => setStatus(s)}
              style={{ textTransform: 'capitalize', flex: 'none', padding: '7px 14px' }}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="page-loader"><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">{t('questions.noFound')}</div>
          <div className="empty-state-text">
            {search ? t('questions.noFoundSearch') : t('questions.noFoundEmpty')}
          </div>
          {!search && (
            <Link href="/student/questions/new" className="btn btn-primary" style={{ marginTop: 16 }}>
              <Plus size={15} /> {t('questions.askFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(q => (
            <Link key={q.id} href={`/student/questions/${q.id}`} className={`question-card ${q.status}`}>
              <div className="question-meta">
                {statusBadge(q.status)}
                {q.category && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📚 {q.category.subject} › {q.category.lesson}
                  </span>
                )}
                {q.attachments?.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📎 {q.attachments.length} {q.attachments.length > 1 ? t('common.files') : t('common.file')}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="question-excerpt">
                {q.content.length > 160 ? q.content.slice(0, 160) + '…' : q.content}
              </p>
              {q.answers?.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
                  💬 {q.answers.length} {q.answers.length > 1 ? t('questions.answers') : t('questions.answer')}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">
            {t('common.prev')}
          </button>
          <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            {t('common.page')} {page} {t('common.of')} {Math.ceil(total / LIMIT)}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)} className="btn btn-secondary btn-sm">
            {t('common.next')}
          </button>
        </div>
      )}
    </AppShell>
  );
}
