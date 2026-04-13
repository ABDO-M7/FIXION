'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { questionsApi } from '@/lib/api';
import { Search, HelpCircle, CheckCircle, Clock, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const STATUS_FILTERS = ['all', 'pending', 'answered', 'closed'] as const;

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const res = await questionsApi.all(params);
      setQuestions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestions(); }, [status, page]);
  useEffect(() => { const t = setTimeout(fetchQuestions, 500); return () => clearTimeout(t); }, [search]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await questionsApi.updateStatus(id, newStatus);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    } catch {}
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question and its answers?')) return;
    try {
      await questionsApi.delete(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setTotal(t => t - 1);
    } catch {}
  };

  const statusBadge = (s: string) => {
    if (s === 'answered') return <span className="badge badge-answered">✓ Answered</span>;
    if (s === 'pending') return <span className="badge badge-pending">⏳ Pending</span>;
    return <span className="badge badge-closed">Closed</span>;
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Questions</h1>
          <p className="page-subtitle">{total.toLocaleString()} questions total</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total', value: total, icon: HelpCircle, color: 'var(--primary-light)' },
          { label: 'Pending', value: questions.filter(q => q.status === 'pending').length, icon: Clock, color: 'var(--warning)' },
          { label: 'Answered', value: questions.filter(q => q.status === 'answered').length, icon: CheckCircle, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
            <s.icon size={20} style={{ color: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." />
        </div>
        <div className="tabs" style={{ flex: 'none' }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} className={`tab-btn ${status === s ? 'active' : ''}`}
              onClick={() => { setStatus(s); setPage(1); }}
              style={{ textTransform: 'capitalize', flex: 'none', padding: '7px 14px' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Student</th>
              <th>Category</th>
              <th>Status</th>
              <th>Asked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No questions found</td></tr>
            ) : questions.map(q => (
              <tr key={q.id}>
                <td>
                  <div style={{ maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-primary)' }}>
                    {q.content}
                  </div>
                  {q.attachments?.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📎 {q.attachments.length} file(s)</span>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>{q.student?.name || '—'}</td>
                <td style={{ fontSize: 12 }}>
                  {q.category ? (
                    <span className="badge badge-student" style={{ fontSize: 11 }}>
                      {q.category.subject}
                    </span>
                  ) : '—'}
                </td>
                <td>{statusBadge(q.status)}</td>
                <td style={{ fontSize: 12 }}>{formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {q.status === 'pending' && (
                      <button onClick={() => updateStatus(q.id, 'closed')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                        Close
                      </button>
                    )}
                    {q.status === 'closed' && (
                      <button onClick={() => updateStatus(q.id, 'pending')} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                        Reopen
                      </button>
                    )}
                    <button onClick={() => deleteQuestion(q.id)} className="btn btn-danger btn-sm" style={{ fontSize: 11 }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">← Prev</button>
          <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)} className="btn btn-secondary btn-sm">Next →</button>
        </div>
      )}
    </AppShell>
  );
}
