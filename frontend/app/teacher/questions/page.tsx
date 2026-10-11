'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  X,
  Send,
  BookOpen,
  Paperclip,
  Search,
  User,
  GraduationCap,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  Upload,
  Check,
  ChevronRight,
} from 'lucide-react';
import { questionsApi, answersApi, categoriesApi, uploadsApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';

const STATUS_FILTERS = ['all', 'pending', 'answered', 'closed'] as const;

export default function TeacherQuestionsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedQ, setSelectedQ] = useState<any>(null);
  const [existingAnswers, setExistingAnswers] = useState<any[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [assigningCategory, setAssigningCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    subject: '',
    bookName: '',
    chapter: '',
    lesson: '',
    questionNumber: '',
  });

  const LIMIT = 15;

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const res = await questionsApi.all(params);
      setQuestions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [status, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchQuestions();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    categoriesApi.list()
      .then(res => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  const selectQuestion = async (q: any) => {
    setSelectedQ(q);
    setAnswerText('');
    setUploadedImages([]);
    setCategoryForm({
      subject: q.category?.subject || q.courseName || '',
      bookName: q.category?.bookName || q.bookName || '',
      chapter: q.category?.chapter || q.chapter || '',
      lesson: q.category?.lesson || q.lesson || '',
      questionNumber: q.category?.questionNumber || q.questionNumber || '',
    });

    setLoadingAnswers(true);
    try {
      const res = await answersApi.byQuestion(q.id);
      setExistingAnswers(Array.isArray(res.data) ? res.data : q.answers || []);
    } catch {
      setExistingAnswers(q.answers || []);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const submitAnswer = async () => {
    if (!answerText.trim() || !selectedQ) return;
    setSubmitting(true);
    try {
      const res = await answersApi.create(selectedQ.id, {
        content: answerText.trim(),
        attachments: uploadedImages,
      });
      toast.success('Answer submitted successfully');
      setExistingAnswers(prev => [...prev, res.data]);
      setAnswerText('');
      setUploadedImages([]);
      setSelectedQ((prev: any) => (prev ? { ...prev, status: 'answered' } : null));
      setQuestions(prev =>
        prev.map(q => (q.id === selectedQ.id ? { ...q, status: 'answered' } : q))
      );
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const updateQuestionStatus = async (newStatus: 'pending' | 'closed') => {
    if (!selectedQ) return;
    try {
      await questionsApi.updateStatus(selectedQ.id, newStatus);
      toast.success(`Question marked as ${newStatus}`);
      setSelectedQ((prev: any) => (prev ? { ...prev, status: newStatus } : null));
      setQuestions(prev =>
        prev.map(q => (q.id === selectedQ.id ? { ...q, status: newStatus } : q))
      );
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      setUploadedImages(prev => [...prev, res.data.url]);
      toast.success('Image attached');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const assignCategory = async () => {
    if (!selectedQ || !categoryForm.subject) return;
    setAssigningCategory(true);
    try {
      const existing = categories.find(
        c =>
          c.subject === categoryForm.subject &&
          c.bookName === categoryForm.bookName &&
          c.chapter === categoryForm.chapter &&
          c.lesson === categoryForm.lesson
      );
      let cat = existing;
      if (!cat) {
        const res = await categoriesApi.create({
          ...categoryForm,
          questionNumber: categoryForm.questionNumber ? +categoryForm.questionNumber : undefined,
        });
        cat = res.data;
        setCategories(prev => [...prev, cat]);
      }
      await questionsApi.assignCategory(selectedQ.id, cat.id);
      toast.success('Category assigned successfully');
      setSelectedQ((prev: any) => (prev ? { ...prev, category: cat } : null));
      setQuestions(prev =>
        prev.map(q => (q.id === selectedQ.id ? { ...q, category: cat } : q))
      );
    } catch {
      toast.error('Failed to assign category');
    } finally {
      setAssigningCategory(false);
    }
  };

  const pendingCount = questions.filter(q => q.status === 'pending').length;
  const answeredCount = questions.filter(q => q.status === 'answered').length;

  const renderStatusBadge = (s: string) => {
    if (s === 'answered') {
      return (
        <span className="badge badge-answered" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} /> {t('status.answered')}
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} /> {t('status.pending')}
        </span>
      );
    }
    return (
      <span className="badge badge-closed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Check size={12} /> {t('status.closed')}
      </span>
    );
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.allQuestions')}</h1>
          <p className="page-subtitle">
            {t('questions.subtitle') ? `${total} questions total` : 'Review and answer questions asked by enrolled students'}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <HelpCircle size={20} style={{ color: 'var(--primary-light)' }} />
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Questions</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Clock size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Pending on page</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-value">{answeredCount}</div>
          <div className="stat-label">Answered on page</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedQ ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Questions List Column */}
        <div>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
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
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                  style={{ textTransform: 'capitalize', flex: 'none', padding: '6px 14px', fontSize: 13 }}
                >
                  {s === 'all' ? (t('nav.allQuestions') === 'Questions' ? 'All' : 'الكل') : t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="page-loader"><span className="spinner" /></div>
          ) : questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CheckCircle2 size={36} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="empty-state-title">No questions found</div>
              <div className="empty-state-text">No student questions match this criteria.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map(q => {
                const isSelected = selectedQ?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => selectQuestion(q)}
                    className={`question-card ${q.status}`}
                    style={{
                      cursor: 'pointer',
                      borderLeftWidth: isSelected ? 4 : undefined,
                      borderColor: isSelected ? 'var(--primary)' : undefined,
                      boxShadow: isSelected ? 'var(--shadow-glow)' : undefined,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div className="question-meta" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {renderStatusBadge(q.status)}

                      {q.category ? (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <BookOpen size={11} style={{ color: 'var(--primary-light)' }} />
                          {q.category.subject} {q.category.questionNumber ? `(Q.${q.category.questionNumber})` : ''}
                        </span>
                      ) : q.courseName ? (
                        <span style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <GraduationCap size={12} /> {q.courseName}
                          {q.questionNumber && <span style={{ color: 'var(--text-muted)' }}>· Q.{q.questionNumber}</span>}
                        </span>
                      ) : null}

                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="question-excerpt" style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>
                      {q.content.length > 120 ? q.content.slice(0, 120) + '…' : q.content}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <User size={12} style={{ color: 'var(--primary-light)' }} />
                        {q.student?.name || 'Student'}
                      </span>
                      {q.answers?.length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontWeight: 500 }}>
                          <MessageSquare size={12} />
                          {q.answers.length} {q.answers.length > 1 ? 'answers' : 'answer'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {total > LIMIT && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                {t('common.prev')}
              </button>
              <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                {t('common.page')} {page} {t('common.of')} {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="btn btn-secondary btn-sm"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>

        {/* Selected Question Details & Answer Composer */}
        {selectedQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {renderStatusBadge(selectedQ.status)}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {format(new Date(selectedQ.createdAt), 'MMM d, yyyy · h:mm a')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selectedQ.status === 'pending' ? (
                    <button
                      onClick={() => updateQuestionStatus('closed')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11 }}
                    >
                      Close Question
                    </button>
                  ) : (
                    <button
                      onClick={() => updateQuestionStatus('pending')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <RotateCcw size={11} /> Reopen
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedQ(null)}
                    className="icon-btn"
                    style={{ width: 28, height: 28 }}
                    title="Close details"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Student Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)', fontWeight: 600, fontSize: 13 }}>
                  {selectedQ.student?.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedQ.student?.name || 'Student'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedQ.student?.email || ''}</div>
                </div>
              </div>

              {/* Course Meta Tags */}
              {(selectedQ.courseName || selectedQ.bookName || selectedQ.chapter || selectedQ.lesson || selectedQ.questionNumber) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {selectedQ.courseName && (
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.25)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <GraduationCap size={12} /> {selectedQ.courseName}
                    </span>
                  )}
                  {selectedQ.bookName && (
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Book: {selectedQ.bookName}
                    </span>
                  )}
                  {selectedQ.chapter && (
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Ch. {selectedQ.chapter}
                    </span>
                  )}
                  {selectedQ.lesson && (
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Lesson {selectedQ.lesson}
                    </span>
                  )}
                  {selectedQ.questionNumber && (
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Q. {selectedQ.questionNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Question Content */}
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: 14 }}>
                {selectedQ.content}
              </div>

              {/* Student Attachments */}
              {selectedQ.attachments?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Paperclip size={13} /> Student Attachments ({selectedQ.attachments.length})
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {selectedQ.attachments.map((url: string, i: number) => {
                      const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      return isImg ? (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'block', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}
                        >
                          <img src={url} alt={`attachment-${i}`} style={{ height: 120, objectFit: 'cover' }} />
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Paperclip size={12} /> Download file {i + 1}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Assignment Section */}
              <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={13} style={{ color: 'var(--primary-light)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Curriculum Category</span>
                    {selectedQ.category && (
                      <span className="badge badge-answered" style={{ fontSize: 10, padding: '1px 6px' }}>
                        Assigned
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input
                    value={categoryForm.subject}
                    onChange={e => setCategoryForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject / Course"
                    style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                  <input
                    value={categoryForm.bookName}
                    onChange={e => setCategoryForm(f => ({ ...f, bookName: e.target.value }))}
                    placeholder="Book Name"
                    style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <input
                    value={categoryForm.chapter}
                    onChange={e => setCategoryForm(f => ({ ...f, chapter: e.target.value }))}
                    placeholder="Chapter"
                    style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                  <input
                    value={categoryForm.lesson}
                    onChange={e => setCategoryForm(f => ({ ...f, lesson: e.target.value }))}
                    placeholder="Lesson"
                    style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                  <input
                    value={categoryForm.questionNumber}
                    onChange={e => setCategoryForm(f => ({ ...f, questionNumber: e.target.value }))}
                    placeholder="Q. Number"
                    style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                  />
                </div>
                <button
                  onClick={assignCategory}
                  disabled={assigningCategory || !categoryForm.subject}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {assigningCategory ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={12} />}
                  Save Category Assignment
                </button>
              </div>
            </div>

            {/* Existing Answers */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={14} style={{ color: 'var(--primary-light)' }} />
                Answers ({existingAnswers.length})
              </h3>

              {loadingAnswers ? (
                <div style={{ padding: 20, textAlign: 'center' }}><span className="spinner" /></div>
              ) : existingAnswers.length === 0 ? (
                <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                  No answers submitted yet. Be the first to answer this student below.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {existingAnswers.map((ans, idx) => (
                    <div
                      key={ans.id || idx}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--success)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ans.teacher?.name || 'Staff Member'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {ans.createdAt ? formatDistanceToNow(new Date(ans.createdAt), { addSuffix: true }) : 'Just now'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {ans.content}
                      </p>
                      {ans.attachments?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {ans.attachments.map((url: string, aIdx: number) => (
                            <a
                              key={aIdx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'block', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}
                            >
                              <img src={url} alt={`answer-att-${aIdx}`} style={{ height: 80, objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Answer Composer */}
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Write an Answer
                </label>
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="Explain the solution clearly to the student..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 13,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    marginBottom: 10,
                  }}
                />

                {/* Uploaded image previews */}
                {uploadedImages.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {uploadedImages.map((url, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={url} alt={`upload-${i}`} style={{ height: 60, width: 60, objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(i)}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label
                    className="btn btn-secondary btn-sm"
                    style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                  >
                    {uploading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Paperclip size={13} />}
                    {uploading ? 'Uploading...' : 'Attach Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    onClick={submitAnswer}
                    disabled={submitting || !answerText.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    {submitting ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Send size={13} />}
                    Submit Answer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
