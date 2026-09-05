'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import {
  ArrowLeft, CheckCircle, AlertCircle, XCircle,
  ChevronRight, ChevronLeft, Send, Clock,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// Simple LaTeX preview
function MathText({ text }: { text: string }) {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <span key={i} style={{
              fontFamily: 'Georgia, serif', fontStyle: 'italic',
              background: 'rgba(99,102,241,0.1)', padding: '2px 8px',
              borderRadius: 4, fontSize: '1em',
            }}>
              {part.slice(2, -2).trim()}
            </span>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <em key={i} style={{ fontFamily: 'Georgia, serif', color: 'var(--primary-light)' }}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

type Option = { id: string; text: string; imageUrl?: string };
type Question = {
  id: string;
  questionText: string;
  questionImageUrl: string | null;
  type: 'MULTIPLE_CHOICE' | 'TEXT';
  options: Option[];
  points: number;
  orderIndex: number;
  correctAnswer?: string;
};

// ── Review Screen (after submission) ──────────────────────────────────────────
function ReviewScreen({
  questions,
  answers,
  assignment,
  grade,
  courseId,
}: {
  questions: Question[];
  answers: Record<string, string>;
  assignment: any;
  grade: number | null;
  courseId: string;
}) {
  const isPending = grade === null;
  const maxGrade = assignment?.maxGrade ?? 100;
  const pct = (!isPending && maxGrade > 0) ? Math.round((grade! / maxGrade) * 100) : 0;
  const passed = pct >= 50;

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Link href={`/student/courses/${courseId}`} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
            <ArrowLeft size={14} /> Back to Course
          </Link>
        </div>

        {/* Result Card */}
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: isPending ? 'rgba(99,102,241,0.15)' : (passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'),
            border: `3px solid ${isPending ? 'rgba(99,102,241,0.4)' : (passed ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)')}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isPending
              ? <Clock size={40} style={{ color: '#6366f1' }} />
              : (passed
                  ? <CheckCircle size={40} style={{ color: '#10b981' }} />
                  : <XCircle size={40} style={{ color: '#ef4444' }} />)}
          </div>

          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
              {isPending ? 'Submitted! Awaiting Grading' : (passed ? 'Great Job! 🎉' : 'Keep Practicing 💪')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
              {isPending
                ? 'Your quiz has text questions that require manual grading by your teacher. Your score will appear once graded.'
                : 'Your quiz has been automatically graded. Review your answers below.'}
            </p>
          </div>

          {/* Score – only for fully auto-graded quizzes (no text questions) */}
          {!isPending && (
            <div style={{ width: '100%', maxWidth: 320 }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: passed ? '#10b981' : '#ef4444', letterSpacing: -2 }}>
                {grade} <span style={{ fontSize: 22, fontWeight: 400, color: 'var(--text-muted)' }}>/ {maxGrade}</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginTop: 12 }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${pct}%`,
                  background: passed ? 'var(--gradient-success)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{pct}%</div>
            </div>
          )}
        </div>

        {/* Per-question review */}
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Answer Review</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {questions.map((q, i) => {
            const studentAnswer = answers[q.id];
            const isCorrect = q.type === 'MULTIPLE_CHOICE' && q.correctAnswer && studentAnswer === q.correctAnswer;
            const isWrong = q.type === 'MULTIPLE_CHOICE' && q.correctAnswer && studentAnswer && studentAnswer !== q.correctAnswer;
            const notAnswered = !studentAnswer;

            return (
              <div key={q.id} className="card" style={{
                borderLeft: `3px solid ${
                  q.type === 'TEXT' ? 'rgba(99,102,241,0.5)' :
                  isCorrect ? 'rgba(16,185,129,0.6)' :
                  isWrong ? 'rgba(239,68,68,0.6)' :
                  'rgba(245,158,11,0.5)'
                }`,
                gap: 14, display: 'flex', flexDirection: 'column',
              }}>
                {/* Q header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(99,102,241,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 12, color: '#a5b4fc',
                  }}>Q{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
                      <MathText text={q.questionText} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {q.points} pt{q.points !== 1 ? 's' : ''} ·{' '}
                      {q.type === 'TEXT' ? (
                        <span style={{ color: '#a5b4fc' }}>Manual grading</span>
                      ) : isCorrect ? (
                        <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Correct</span>
                      ) : isWrong ? (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ Incorrect</span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>— Not answered</span>
                      )}
                    </div>
                  </div>
                </div>

                {q.questionImageUrl && (
                  <img src={q.questionImageUrl} alt="Q" style={{ maxHeight: 200, borderRadius: 8, objectFit: 'contain', alignSelf: 'flex-start' }} />
                )}

                {/* MCQ: show all options with correct/wrong highlights */}
                {q.type === 'MULTIPLE_CHOICE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map(opt => {
                      const isStudentChoice = studentAnswer === opt.id;
                      const isCorrectOpt = q.correctAnswer === opt.id;
                      let bg = 'rgba(255,255,255,0.02)';
                      let border = 'var(--border)';
                      let textColor = 'var(--text-secondary)';
                      if (isCorrectOpt) { bg = 'rgba(16,185,129,0.08)'; border = 'rgba(16,185,129,0.5)'; textColor = '#34d399'; }
                      if (isStudentChoice && !isCorrectOpt) { bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.5)'; textColor = '#f87171'; }

                      return (
                        <div key={opt.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          border: `1px solid ${border}`, background: bg,
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: isCorrectOpt ? 'rgba(16,185,129,0.2)' : isStudentChoice ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 12, color: textColor,
                          }}>
                            {isCorrectOpt ? <CheckCircle size={14} /> : isStudentChoice ? <XCircle size={14} /> : opt.id}
                          </div>
                          <div style={{ flex: 1, fontSize: 13, color: textColor }}>
                            {opt.text ? <MathText text={opt.text} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                          {opt.imageUrl && <img src={opt.imageUrl} alt={opt.id} style={{ height: 48, borderRadius: 6, objectFit: 'contain' }} />}
                          {isCorrectOpt && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>CORRECT</span>}
                          {isStudentChoice && !isCorrectOpt && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>YOUR ANSWER</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text answer */}
                {q.type === 'TEXT' && (
                  <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 8, padding: '12px 14px', borderLeft: '3px solid rgba(99,102,241,0.3)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Answer</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {studentAnswer || <em style={{ color: 'var(--text-muted)' }}>Not answered</em>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link href={`/student/courses/${courseId}`} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={15} /> Back to Course
        </Link>
      </div>
    </AppShell>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function QuizAttemptPage() {
  const { id, assignmentId } = useParams<{ id: string; assignmentId: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignment, setAssignment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // If the student already submitted: { grade, submitted: true }
  const [submitted, setSubmitted] = useState<{ grade: number | null; answers: Record<string, string> } | null>(null);

  useEffect(() => {
    Promise.all([
      assignmentsApi.getQuestions(assignmentId),
      assignmentsApi.mySubmission(assignmentId).catch(() => null),
    ]).then(([qRes, subRes]) => {
      const qs = (qRes.data as Question[]).sort((a, b) => a.orderIndex - b.orderIndex);
      setQuestions(qs);

      if (subRes?.data) {
        const sub = subRes.data;
        let savedAnswers: Record<string, string> = {};
        if (sub.content) {
          try { savedAnswers = JSON.parse(sub.content); } catch {}
        }
        // Use maxGrade returned by the backend (now included in mySubmission response)
        setAssignment((prev: any) => ({ ...prev, maxGrade: sub.maxGrade ?? prev?.maxGrade ?? 100 }));
        // Student already submitted: show review screen
        setSubmitted({ grade: sub.grade ?? null, answers: savedAnswers });
      }
    }).catch(() => toast.error('Failed to load quiz'))
      .finally(() => setLoading(false));

    // Also fetch assignment info to get maxGrade and title
    assignmentsApi.myAssignments('_', '_').catch(() => null); // fire and forget if needed
  }, [assignmentId]);

  // Fetch assignment metadata separately via student assignments list
  useEffect(() => {
    // We'll get maxGrade from the quiz-submit response; pre-load via a separate endpoint if available
    // For now, store it when submitting
  }, []);

  const setAnswer = (qid: string, val: string) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));

  const answered = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;

  const submit = async () => {
    if (answered < questions.length) {
      const unanswered = questions.length - answered;
      if (!confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
    }
    setSubmitting(true);
    try {
      const res = await assignmentsApi.quizSubmit(assignmentId, answers);
      const data = res.data as any;
      // Store maxGrade from response
      setAssignment((prev: any) => ({ ...prev, maxGrade: data.maxGrade ?? prev?.maxGrade ?? 100 }));
      setSubmitted({ grade: data.grade, answers });
      toast.success('Quiz submitted!');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      </AppShell>
    );
  }

  // If student already submitted, show review screen
  if (submitted) {
    return (
      <ReviewScreen
        questions={questions}
        answers={submitted.answers}
        assignment={assignment}
        grade={submitted.grade}
        courseId={id}
      />
    );
  }

  // Empty quiz state
  if (questions.length === 0) {
    return (
      <AppShell>
        <div style={{ maxWidth: 540, margin: '80px auto', textAlign: 'center' }}>
          <div className="card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171'
            }}>
              <AlertCircle size={36} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Quiz Not Available</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              This quiz has no questions published yet by your teacher.
            </p>
            <Link href={`/student/courses/${id}`} className="btn btn-primary" style={{ marginTop: 12 }}>
              <ArrowLeft size={15} /> Back to Course
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Quiz attempt ───────────────────────────────────────────────────────────
  const q = questions[current];
  if (!q) return null;

  return (
    <AppShell>
      {/* Top bar */}
      <div className="page-header">
        <div>
          <Link href={`/student/courses/${id}`} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Course
          </Link>
          <h1 className="page-title">Quiz</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {answered} / {questions.length} answered
          </span>
          {/* Progress bar */}
          <div style={{ width: 160, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${(answered / questions.length) * 100}%`,
              background: 'var(--gradient-primary)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Question breadcrumbs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: `1px solid ${i === current ? 'rgba(99,102,241,0.6)' : answers[questions[i].id] ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
              background: i === current ? 'rgba(99,102,241,0.15)' : answers[questions[i].id] ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              color: i === current ? 'var(--primary-light)' : answers[questions[i].id] ? '#34d399' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'var(--transition)',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
        {/* Question header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#a5b4fc',
          }}>
            Q{current + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.65 }}>
              <MathText text={q.questionText} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {q.points} point{q.points !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Question image */}
        {q.questionImageUrl && (
          <img
            src={q.questionImageUrl}
            alt="Question"
            style={{ maxHeight: 280, borderRadius: 10, objectFit: 'contain', alignSelf: 'flex-start' }}
          />
        )}

        {/* MCQ options */}
        {q.type === 'MULTIPLE_CHOICE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options.map(opt => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setAnswer(q.id, opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 12, textAlign: 'left',
                    border: `2px solid ${selected ? 'rgba(99,102,241,0.6)' : 'var(--border)'}`,
                    background: selected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', transition: 'var(--transition)', width: '100%',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: selected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 13,
                    color: selected ? 'var(--primary-light)' : 'var(--text-muted)',
                    border: `2px solid ${selected ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                    {selected ? <CheckCircle size={15} /> : opt.id}
                  </div>
                  <div style={{ flex: 1, fontSize: 14 }}>
                    {opt.text ? <MathText text={opt.text} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                  {opt.imageUrl && (
                    <img src={opt.imageUrl} alt={opt.id} style={{ height: 60, borderRadius: 8, objectFit: 'contain' }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Text answer */}
        {q.type === 'TEXT' && (
          <textarea
            className="form-input form-textarea"
            placeholder="Type your answer here…"
            value={answers[q.id] || ''}
            onChange={e => setAnswer(q.id, e.target.value)}
            style={{ minHeight: 110 }}
          />
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, maxWidth: 720 }}>
        <button
          className="btn btn-secondary"
          disabled={current === 0}
          onClick={() => setCurrent(c => c - 1)}
        >
          <ChevronLeft size={15} /> Previous
        </button>

        {current < questions.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button
            className="btn btn-success"
            onClick={submit}
            disabled={submitting}
            style={{ minWidth: 140 }}
          >
            {submitting
              ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />
              : <Send size={15} />}
            Submit Quiz
          </button>
        )}
      </div>
    </AppShell>
  );
}
