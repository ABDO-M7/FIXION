'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { questionsApi, answersApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Paperclip, GraduationCap, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [answers, setAnswers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [qRes, aRes] = await Promise.all([
        questionsApi.one(id),
        answersApi.byQuestion(id),
      ]);
      setQuestion(qRes.data);
      // Normalize: use dedicated answers endpoint as source of truth
      const fetchedAnswers = Array.isArray(aRes.data) ? aRes.data
        : Array.isArray(qRes.data?.answers) ? qRes.data.answers
        : [];
      setAnswers(fetchedAnswers);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // Auto-poll every 30s while question is still pending
  useEffect(() => {
    if (!question || question.status !== 'pending') return;
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [question?.status, id]);

  if (loading) return <AppShell><div className="page-loader"><span className="spinner" /></div></AppShell>;
  if (!question) return <AppShell><div className="empty-state"><div className="empty-state-icon">❌</div><div className="empty-state-title">Question not found</div></div></AppShell>;

  const statusBadge = (s: string) => {
    if (s === 'answered') return <span className="badge badge-answered">✓ Answered</span>;
    if (s === 'pending') return <span className="badge badge-pending">⏳ Pending</span>;
    return <span className="badge badge-closed">Closed</span>;
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Link href="/student/questions" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
            <ArrowLeft size={14} /> Back to Questions
          </Link>
          <button
            onClick={() => load(true)}
            className="btn btn-secondary btn-sm"
            disabled={refreshing}
            title="Refresh to check for new answers"
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Question */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="question-meta" style={{ marginBottom: 16 }}>
            {statusBadge(question.status)}
            {(question.courseName || question.bookName) && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {question.courseName && <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>📘 {question.courseName}</span>}
                {question.bookName && <span>📖 {question.bookName}</span>}
                {question.chapter && <span>Ch. {question.chapter}</span>}
                {question.lesson && <span>Lesson {question.lesson}</span>}
                {question.questionNumber && <span>Q. {question.questionNumber}</span>}
              </span>
            )}
            {question.category && (
              <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.2)' }}>
                📚 {question.category.subject} › {question.category.bookName} › {question.category.chapter} › {question.category.lesson}
                {question.category.questionNumber && ` · Q.${question.category.questionNumber}`}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {format(new Date(question.createdAt), 'MMM d, yyyy · h:mm a')}
            </span>
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {question.content}
          </p>

          {question.attachments?.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Paperclip size={13} style={{ display: 'inline', marginRight: 4 }} />Attachments
              </span>
              {question.attachments.map((url: string, i: number) => {
                const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                return isImg ? (
                  <img key={i} src={url} alt={`Attachment ${i+1}`} style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
                    📎 Download attachment {i+1}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Answers */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            {answers.length > 0 ? `${answers.length} Answer${answers.length > 1 ? 's' : ''}` : 'No answers yet'}
          </h2>

          {answers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Waiting for a teacher to answer...</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You'll get a notification when your question is answered.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {answers.map((answer: any) => (
                <div key={answer.id} className="card" style={{ borderLeft: '3px solid var(--success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                      {answer.teacher?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        <GraduationCap size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--primary-light)' }} />
                        {answer.teacher?.name || 'Teacher'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    <span className="badge badge-answered" style={{ marginLeft: 'auto' }}>Verified Answer</span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {answer.content}
                  </p>
                  {answer.attachments?.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {answer.attachments.map((url: string, i: number) => {
                        const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        return isImg
                          ? <img key={i} src={url} alt={`Answer attachment ${i+1}`} style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                          : <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>📎 Attachment {i+1}</a>;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
