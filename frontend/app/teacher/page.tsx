'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { questionsApi, answersApi, categoriesApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { HelpCircle, CheckCircle, Clock, MessageSquare, Search, Filter, X, Send, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'pending', 'answered', 'closed'] as const;

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedQ, setSelectedQ] = useState<any>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [assigningCategory, setAssigningCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ subject: '', bookName: '', chapter: '', lesson: '', questionNumber: '' });

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const res = await questionsApi.all(params);
      setQuestions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestions(); }, [status, page]);
  useEffect(() => { const t = setTimeout(fetchQuestions, 500); return () => clearTimeout(t); }, [search]);
  useEffect(() => { categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {}); }, []);

  const submitAnswer = async () => {
    if (!answerText.trim() || !selectedQ) return;
    setSubmitting(true);
    try {
      await answersApi.create(selectedQ.id, { content: answerText });
      toast.success('Answer submitted!');
      setAnswerText('');
      setSelectedQ(null);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit answer');
    } finally { setSubmitting(false); }
  };

  const createAndAssignCategory = async () => {
    if (!selectedQ) return;
    setAssigningCategory(true);
    try {
      // Check if category already exists
      const existing = categories.find(c =>
        c.subject === categoryForm.subject && c.bookName === categoryForm.bookName &&
        c.chapter === categoryForm.chapter && c.lesson === categoryForm.lesson
      );
      let cat = existing;
      if (!cat) {
        const res = await categoriesApi.create({ ...categoryForm, questionNumber: categoryForm.questionNumber ? +categoryForm.questionNumber : undefined });
        cat = res.data;
        setCategories(prev => [...prev, cat]);
      }
      await questionsApi.assignCategory(selectedQ.id, cat.id);
      toast.success('Category assigned!');
      setSelectedQ((prev: any) => prev ? { ...prev, category: cat } : null);
    } catch (err: any) {
      toast.error('Failed to assign category');
    } finally { setAssigningCategory(false); }
  };

  const stats = { total, pending: questions.filter(q => q.status === 'pending').length, answered: questions.filter(q => q.status === 'answered').length };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher Panel</h1>
          <p className="page-subtitle">Welcome, {user?.name} — answer student questions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}><HelpCircle size={20} style={{ color: 'var(--primary-light)' }} /></div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Questions</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><Clock size={20} style={{ color: 'var(--warning)' }} /></div>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending (this page)</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CheckCircle size={20} style={{ color: 'var(--success)' }} /></div>
          <div className="stat-value">{stats.answered}</div>
          <div className="stat-label">Answered (this page)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedQ ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Questions list */}
        <div>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." />
            </div>
            <div className="tabs" style={{ flex: 'none' }}>
              {STATUS_FILTERS.map(s => (
                <button key={s} className={`tab-btn ${status === s ? 'active' : ''}`}
                  onClick={() => { setStatus(s); setPage(1); }} style={{ textTransform: 'capitalize', flex: 'none', padding: '6px 12px', fontSize: 12 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="page-loader"><span className="spinner" /></div>
          ) : questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">No questions here</div>
              <div className="empty-state-text">All caught up! Try a different filter.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map(q => (
                <div
                  key={q.id}
                  onClick={() => { setSelectedQ(q); setAnswerText(''); setCategoryForm({ subject: q.category?.subject || '', bookName: q.category?.bookName || '', chapter: q.category?.chapter || '', lesson: q.category?.lesson || '', questionNumber: q.category?.questionNumber || '' }); }}
                  className={`question-card ${q.status}`}
                  style={{ borderColor: selectedQ?.id === q.id ? 'var(--primary)' : undefined, boxShadow: selectedQ?.id === q.id ? 'var(--shadow-glow)' : undefined }}
                >
                  <div className="question-meta">
                    {q.status === 'pending' ? <span className="badge badge-pending">⏳ Pending</span> : <span className="badge badge-answered">✓ Answered</span>}
                    {q.category && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📚 {q.category.subject}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="question-excerpt" style={{ fontSize: 13 }}>
                    {q.content.length > 100 ? q.content.slice(0, 100) + '…' : q.content}
                  </p>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    👤 {q.student?.name || 'Student'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > 15 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{page} / {Math.ceil(total / 15)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)} className="btn btn-secondary btn-sm">Next →</button>
            </div>
          )}
        </div>

        {/* Answer Panel */}
        {selectedQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ flex: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14 }}>Question</h3>
                <button onClick={() => setSelectedQ(null)} className="icon-btn" style={{ width: 28, height: 28 }}><X size={14} /></button>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{selectedQ.content}</p>

              {/* Category Assignment */}
              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <BookOpen size={13} style={{ color: 'var(--primary-light)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Assign Category</span>
                  {selectedQ.category && <span className="badge badge-answered" style={{ fontSize: 10, padding: '1px 6px' }}>Set</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['subject', 'bookName', 'chapter', 'lesson'].map(field => (
                    <input
                      key={field}
                      value={(categoryForm as any)[field]}
                      onChange={e => setCategoryForm(prev => ({ ...prev, [field]: e.target.value }))}
                      className="form-input"
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace('N', ' N')}
                      style={{ fontSize: 12, padding: '7px 10px' }}
                    />
                  ))}
                  <input
                    value={categoryForm.questionNumber}
                    onChange={e => setCategoryForm(prev => ({ ...prev, questionNumber: e.target.value }))}
                    className="form-input"
                    placeholder="Q. Number"
                    type="number"
                    style={{ fontSize: 12, padding: '7px 10px' }}
                  />
                  <button
                    onClick={createAndAssignCategory}
                    disabled={assigningCategory || !categoryForm.subject}
                    className="btn btn-secondary btn-sm"
                  >
                    {assigningCategory ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Write Answer */}
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Your Answer</h3>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                className="form-input form-textarea"
                placeholder="Write a clear, detailed answer. Use examples where helpful..."
                style={{ minHeight: 180, marginBottom: 12 }}
              />
              <button
                onClick={submitAnswer}
                disabled={submitting || !answerText.trim()}
                className="btn btn-primary btn-full"
              >
                {submitting
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</>
                  : <><Send size={15} /> Submit Answer</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
