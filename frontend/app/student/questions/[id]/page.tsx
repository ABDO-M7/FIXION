'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { questionsApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Paperclip, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    questionsApi.one(id).then(r => setQuestion(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

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
        <Link href="/student/questions" className="btn btn-ghost btn-sm" style={{ marginBottom: 16, paddingLeft: 0 }}>
          <ArrowLeft size={14} /> Back to Questions
        </Link>

        {/* Question */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="question-meta" style={{ marginBottom: 16 }}>
            {statusBadge(question.status)}
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
            {question.answers?.length > 0 ? `${question.answers.length} Answer${question.answers.length > 1 ? 's' : ''}` : 'No answers yet'}
          </h2>

          {question.answers?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Waiting for a teacher to answer...</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You'll get a notification when your question is answered.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {question.answers.map((answer: any) => (
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
