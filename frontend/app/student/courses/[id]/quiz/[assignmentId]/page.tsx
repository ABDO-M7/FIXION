'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import {
  ArrowLeft, CheckCircle, AlertCircle, XCircle,
  ChevronRight, ChevronLeft, Send, Clock, ShieldAlert,
  ShieldCheck, Maximize2, Lock, EyeOff, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const MAX_VIOLATIONS = 5;

export interface QuizViolationEvent {
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'WINDOW_RESIZE' | 'FULLSCREEN_EXIT' | 'COPY_ATTEMPT' | 'DEVTOOLS_ATTEMPT';
  timestamp: string;
  detail: string;
}

export interface QuizProctoringReport {
  totalViolations: number;
  tabSwitches: number;
  windowBlurs: number;
  windowResizes: number;
  fullscreenExits: number;
  copyAttempts: number;
  autoSubmitted: boolean;
  startedAt: string | null;
  submittedAt: string | null;
  events: QuizViolationEvent[];
}

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
  proctoring,
  aiGrades,
}: {
  questions: Question[];
  answers: Record<string, string>;
  assignment: any;
  grade: number | null;
  courseId: string;
  proctoring?: QuizProctoringReport | null;
  aiGrades?: Record<string, { score: number; maxPoints: number; feedback: string; gradedByAi?: boolean }> | null;
}) {
  const isPending = grade === null;
  const maxGrade = assignment?.maxGrade ?? 100;
  const pct = (!isPending && maxGrade > 0) ? Math.round((grade! / maxGrade) * 100) : 0;
  const passed = pct >= 50;

  const wrongCount = questions.filter(q => {
    if (q.type !== 'MULTIPLE_CHOICE' || !q.correctAnswer) return false;
    const ans = answers[q.id];
    return !ans || ans.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase();
  }).length;

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
          <Link href={`/student/courses/${courseId}`} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
            <ArrowLeft size={14} /> العودة للكورس
          </Link>
          <Link href="/student/mistakes" className="btn btn-secondary btn-sm">
            <BookOpen size={14} /> بنك أخطائي ({wrongCount} في هذا الامتحان)
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
              {isPending ? 'تم تسليم الامتحان! بانتظار التصحيح' : (passed ? 'أحسنت! عمل رائع' : 'استمر في المحاولة والمراجعة')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
              {isPending
                ? 'يحتوي الامتحان على أسئلة مقالية سيتم تصحيحها من قِبل المدرس أو الأسيستنت.'
                : 'تم تصحيح الامتحان تلقائياً. راجع إجاباتك بالأسفل وتم حفظ أخطائك تلقائياً في بنك الأخطاء.'}
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

          {proctoring && proctoring.totalViolations > 0 && (
            <div style={{
              marginTop: 8,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#fbbf24',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <ShieldAlert size={16} />
              <span>
                تم تسجيل {proctoring.totalViolations} مخالفة أثناء الامتحان وإرفاقها في التقرير للمدرس والأسيستنت
                {proctoring.autoSubmitted ? ' (تم الإرسال التلقائي لتجاوز الحد الأقصى للمخالفات)' : ''}.
              </span>
            </div>
          )}
        </div>

        {/* Per-question review */}
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>مراجعة الإجابات</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {questions.map((q, i) => {
            const studentAnswer = answers[q.id];
            const isCorrect = q.type === 'MULTIPLE_CHOICE' && q.correctAnswer && studentAnswer === q.correctAnswer;
            const isWrong = q.type === 'MULTIPLE_CHOICE' && q.correctAnswer && studentAnswer && studentAnswer !== q.correctAnswer;

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
                        aiGrades?.[q.id] ? (
                          <span style={{ color: '#34d399', fontWeight: 700 }}>
                            🤖 تم التصحيح بالذكاء الاصطناعي ({aiGrades[q.id].score} / {aiGrades[q.id].maxPoints} درجة)
                          </span>
                        ) : (
                          <span style={{ color: '#a5b4fc' }}>تصحيح يدوي</span>
                        )
                      ) : isCorrect ? (
                        <span style={{ color: '#10b981', fontWeight: 700 }}>✓ إجابة صحيحة</span>
                      ) : isWrong ? (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ إجابة خاطئة (محفوظة في بنك أخطائك)</span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>— لم تتم الإجابة</span>
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
                          {isCorrectOpt && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>الإجابة الصحيحة</span>}
                          {isStudentChoice && !isCorrectOpt && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>إجابتك</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text answer */}
                {q.type === 'TEXT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 8, padding: '12px 14px', borderLeft: '3px solid rgba(99,102,241,0.3)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>إجابتك</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {studentAnswer || <em style={{ color: 'var(--text-muted)' }}>لم تتم الإجابة</em>}
                      </div>
                    </div>

                    {aiGrades?.[q.id] && (
                      <div style={{
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#34d399' }}>
                          <span>🤖 تقييم الذكاء الاصطناعي للإجابة المقالية</span>
                          <span>الدرجة: {aiGrades[q.id].score} / {aiGrades[q.id].maxPoints}</span>
                        </div>
                        {aiGrades[q.id].feedback && (
                          <div style={{ fontSize: 12.5, color: '#d1fae5', lineHeight: 1.6 }}>
                            {aiGrades[q.id].feedback}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href={`/student/courses/${courseId}`} className="btn btn-primary">
            <ArrowLeft size={15} /> العودة للكورس
          </Link>
          <Link href="/student/mistakes" className="btn btn-secondary">
            <BookOpen size={15} /> الذهاب إلى بنك أخطائي
          </Link>
        </div>
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
  const [submitted, setSubmitted] = useState<{
    grade: number | null;
    answers: Record<string, string>;
    proctoring?: QuizProctoringReport | null;
    aiGrades?: Record<string, { score: number; maxPoints: number; feedback: string; gradedByAi?: boolean }> | null;
  } | null>(null);

  // ── Proctoring / Anti-Cheat State ──────────────────────────────────────────
  const [examStarted, setExamStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [events, setEvents] = useState<QuizViolationEvent[]>([]);
  const [activeWarning, setActiveWarning] = useState<{
    title: string;
    detail: string;
    count: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const answersRef = useRef<Record<string, string>>({});
  const eventsRef = useRef<QuizViolationEvent[]>([]);
  const lastViolationTsRef = useRef<number>(0);
  const baselineSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const autoSubmittingRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Restore saved session state if student reloaded during quiz
  useEffect(() => {
    if (typeof window === 'undefined' || !assignmentId) return;
    try {
      const raw = sessionStorage.getItem(`quiz_proctoring_${assignmentId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.answers && typeof parsed.answers === 'object') {
          setAnswers(parsed.answers);
          answersRef.current = parsed.answers;
        }
        if (Array.isArray(parsed.events)) {
          setEvents(parsed.events);
          eventsRef.current = parsed.events;
        }
        if (parsed.startedAt) {
          setStartedAt(parsed.startedAt);
        }
      }
    } catch {}
  }, [assignmentId]);

  // Persist answers & violation events to sessionStorage while attempting
  useEffect(() => {
    if (typeof window === 'undefined' || !assignmentId || submitted) return;
    try {
      sessionStorage.setItem(
        `quiz_proctoring_${assignmentId}`,
        JSON.stringify({ answers, events, startedAt }),
      );
    } catch {}
  }, [answers, events, startedAt, assignmentId, submitted]);

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
        let savedProctoring: QuizProctoringReport | null = sub.proctoring || null;
        let savedAiGrades: Record<string, any> | null = sub.aiGrades || null;
        if (sub.content) {
          try {
            const parsed = JSON.parse(sub.content);
            if (parsed && typeof parsed === 'object') {
              if (parsed.__proctoring && !savedProctoring) {
                savedProctoring = parsed.__proctoring;
              }
              if (parsed.__aiGrades && !savedAiGrades) {
                savedAiGrades = parsed.__aiGrades;
              }
              for (const [k, v] of Object.entries(parsed)) {
                if (k !== '__proctoring' && k !== '__aiGrades' && typeof v === 'string') {
                  savedAnswers[k] = v;
                }
              }
            }
          } catch {}
        }
        setAssignment((prev: any) => ({ ...prev, maxGrade: sub.maxGrade ?? prev?.maxGrade ?? 100 }));
        setSubmitted({ grade: sub.grade ?? null, answers: savedAnswers, proctoring: savedProctoring, aiGrades: savedAiGrades });
      }
    }).catch(() => toast.error('Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const buildProctoringReport = useCallback(
    (evList: QuizViolationEvent[], autoSubmitted: boolean): QuizProctoringReport => {
      const tabSwitches = evList.filter(e => e.type === 'TAB_SWITCH').length;
      const windowBlurs = evList.filter(e => e.type === 'WINDOW_BLUR').length;
      const windowResizes = evList.filter(e => e.type === 'WINDOW_RESIZE').length;
      const fullscreenExits = evList.filter(e => e.type === 'FULLSCREEN_EXIT').length;
      const copyAttempts = evList.filter(e => e.type === 'COPY_ATTEMPT' || e.type === 'DEVTOOLS_ATTEMPT').length;
      return {
        totalViolations: evList.length,
        tabSwitches,
        windowBlurs,
        windowResizes,
        fullscreenExits,
        copyAttempts,
        autoSubmitted,
        startedAt: startedAt || new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        events: evList,
      };
    },
    [startedAt],
  );

  const performSubmit = useCallback(
    async (autoSubmit = false, customEvents?: QuizViolationEvent[]) => {
      if (autoSubmittingRef.current) return;
      autoSubmittingRef.current = true;
      setSubmitting(true);
      const finalEvents = customEvents ?? eventsRef.current;
      const proctoringReport = buildProctoringReport(finalEvents, autoSubmit);
      try {
        const res = await assignmentsApi.quizSubmit(assignmentId, answersRef.current, proctoringReport);
        const data = res.data as any;
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`quiz_proctoring_${assignmentId}`);
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
        }
        setAssignment((prev: any) => ({ ...prev, maxGrade: data.maxGrade ?? prev?.maxGrade ?? 100 }));
        setSubmitted({
          grade: data.grade,
          answers: answersRef.current,
          proctoring: proctoringReport,
          aiGrades: data.aiGrades || null,
        });
        if (autoSubmit) {
          toast.error('تم تسليم الامتحان تلقائياً لتجاوز الحد الأقصى للمخالفات الأمنية!');
        } else {
          toast.success('تم تسليم الامتحان بنجاح!');
        }
      } catch (e: any) {
        autoSubmittingRef.current = false;
        toast.error(e?.response?.data?.message || 'فشل تسليم الامتحان');
      } finally {
        setSubmitting(false);
      }
    },
    [assignmentId, buildProctoringReport],
  );

  const recordViolation = useCallback(
    (type: QuizViolationEvent['type'], detail: string, debounceMs = 900) => {
      const now = Date.now();
      if (now - lastViolationTsRef.current < debounceMs) return;
      lastViolationTsRef.current = now;

      const newEvent: QuizViolationEvent = {
        type,
        timestamp: new Date(now).toISOString(),
        detail,
      };
      const updated = [...eventsRef.current, newEvent];
      eventsRef.current = updated;
      setEvents(updated);

      const count = updated.length;
      setActiveWarning({
        title: '⚠️ تحذير أمني: تم رصد محاولة خروج من بيئة الامتحان!',
        detail,
        count,
      });

      if (count >= MAX_VIOLATIONS && !autoSubmittingRef.current) {
        performSubmit(true, updated);
      }
    },
    [performSubmit],
  );

  // Enter fullscreen helper
  const requestExamFullscreen = async () => {
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      // Some mobile browsers don't support fullscreen API; still track window focus/visibility/resize
    }
    if (typeof window !== 'undefined') {
      baselineSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
  };

  const handleStartExam = async () => {
    if (!startedAt) {
      setStartedAt(new Date().toISOString());
    }
    await requestExamFullscreen();
    setExamStarted(true);
  };

  const handleResumeExam = async () => {
    await requestExamFullscreen();
    setActiveWarning(null);
  };

  // Attach strict proctoring listeners while examStarted && !submitted
  useEffect(() => {
    if (!examStarted || submitted || loading || questions.length === 0) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('TAB_SWITCH', 'تم الخروج من تاب الامتحان أو فتح تاب آخر / إخفاء المتصفح');
      }
    };

    const handleWindowBlur = () => {
      // Only fire if document isn't already hidden (to avoid duplicate with visibilitychange)
      if (!document.hidden) {
        recordViolation('WINDOW_BLUR', 'فقدان التركيز: تم النقر خارج نافذة الامتحان أو التبديل لبرنامج آخر');
      }
    };

    const handleFullscreenChange = () => {
      const fsActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fsActive);
      if (!fsActive) {
        recordViolation('FULLSCREEN_EXIT', 'تم الخروج من وضع الشاشة الكاملة (Fullscreen)');
      }
    };

    const handleResize = () => {
      // Ignore resize if an input/textarea is focused on mobile (virtual keyboard)
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      const base = baselineSizeRef.current;
      const screenW = window.screen?.availWidth || base.width || window.innerWidth;
      const screenH = window.screen?.availHeight || base.height || window.innerHeight;
      const refW = Math.max(base.width, Math.round(screenW * 0.9));
      const refH = Math.max(base.height, Math.round(screenH * 0.8));

      if (window.innerWidth < refW * 0.82 || window.innerHeight < refH * 0.78) {
        recordViolation(
          'WINDOW_RESIZE',
          `تم تصغير نافذة الامتحان أو تقسيم الشاشة (${window.innerWidth}×${window.innerHeight})`,
          1500,
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('COPY_ATTEMPT', 'محاولة نسخ أو قص نص من أسئلة الامتحان', 1500);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
        (e.ctrlKey && (key === 'u' || key === 'p' || key === 's'))
      ) {
        e.preventDefault();
        recordViolation('DEVTOOLS_ATTEMPT', `محاولة استخدام اختصار محظور أثناء الامتحان (${e.key})`, 1500);
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        recordViolation('COPY_ATTEMPT', 'محاولة تصوير الشاشة (PrintScreen) أثناء الامتحان', 1500);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'أنت في منتصف الامتحان! الخروج الآن سيتم تسجيله كمخالفة.';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examStarted, submitted, loading, questions.length, recordViolation]);

  const setAnswer = (qid: string, val: string) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));

  const answered = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;

  const submit = async () => {
    if (answered < questions.length) {
      const unanswered = questions.length - answered;
      if (!confirm(`لديك ${unanswered} سؤال غير مجاب عنه. هل تريد تسليم الامتحان على أي حال؟`)) return;
    }
    await performSubmit(false);
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
        proctoring={submitted.proctoring}
        aiGrades={submitted.aiGrades}
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
              This quiz has no questions published yet by a team member.
            </p>
            <Link href={`/student/courses/${id}`} className="btn btn-primary" style={{ marginTop: 12 }}>
              <ArrowLeft size={15} /> Back to Course
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Pre-Exam Proctoring Gate (Before starting) ─────────────────────────────
  if (!examStarted) {
    return (
      <AppShell>
        <div style={{ maxWidth: 620, margin: '36px auto' }}>
          <div className="card" style={{
            padding: '32px 28px',
            border: '1px solid rgba(99,102,241,0.35)',
            background: 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: 'rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
              }}>
                <Lock size={28} />
              </div>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#818cf8',
                  background: 'rgba(99,102,241,0.15)', padding: '3px 10px', borderRadius: 99,
                }}>
                  نظام مراقبة وحماية الامتحانات الذكي
                </span>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 6, marginBottom: 0 }}>
                  تعليمات تأمين الامتحان ({questions.length} سؤال)
                </h1>
              </div>
            </div>

            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.28)',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: 'var(--text-primary)',
            }}>
              <div style={{ fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={17} />
                يرجى الانتباه جيداً قبل البدء — هذا الامتحان مراقَب بالكامل:
              </div>
              <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)' }}>
                <li>سيتم فتح الامتحان في <strong>وضع الشاشة الكاملة (Fullscreen)</strong> طوال مدة الحل.</li>
                <li><strong>ممنوع نهائياً الخروج من التاب</strong> أو فتح أي تاب آخر أو التبديل لأي نافذة/برنامج آخر.</li>
                <li><strong>ممنوع تصغير نافذة المتصفح</strong> أو تقسيم الشاشة (Split Screen) أثناء الامتحان.</li>
                <li><strong>ممنوع النسخ أو اللصق</strong> أو استخدام اختصارات لوحة المفاتيح المحظورة.</li>
                <li>كل محاولة خروج يتم <strong>تسجيلها فوراً بالوقت والتفاصيل وتظهر للمدرس والأسيستنت</strong>، وعند تكرار المخالفة ({MAX_VIOLATIONS} مرات) يتم تسليم الامتحان تلقائياً!</li>
              </ul>
            </div>

            {events.length > 0 && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: '#fbbf24',
                fontSize: 12.5,
              }}>
                لديك إجابات محفوظة من جلسة سابقة في هذا الامتحان ({events.length} مخالفة مسجلة حتى الآن).
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <Link href={`/student/courses/${id}`} className="btn btn-ghost">
                <ArrowLeft size={15} /> العودة للكورس
              </Link>
              <button
                onClick={handleStartExam}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700 }}
              >
                <Maximize2 size={16} /> فهمت التعليمات — ابدأ الامتحان في الشاشة الكاملة
              </button>
            </div>
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
      {/* Blocking Security Warning Modal when student violates proctoring */}
      {activeWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(9, 13, 22, 0.96)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            maxWidth: 500,
            width: '100%',
            background: '#131d33',
            border: '2px solid #ef4444',
            borderRadius: 20,
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(239,68,68,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'rgba(239,68,68,0.18)', border: '2px solid #ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171',
            }}>
              <EyeOff size={34} />
            </div>

            <div style={{
              background: 'rgba(239,68,68,0.2)',
              color: '#fca5a5',
              padding: '4px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 800,
            }}>
              مخالفة مسجلة رقم {activeWarning.count} من {MAX_VIOLATIONS}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {activeWarning.title}
            </h2>

            <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
              {activeWarning.detail}
            </p>

            <div style={{
              width: '100%',
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 12.5,
              color: '#94a3b8',
              lineHeight: 1.6,
            }}>
              تم تسجيل هذه المخالفة بالتوقيت الدقيق لدى <strong style={{ color: '#f8fafc' }}>المدرس والأسيستنت</strong>.
              {MAX_VIOLATIONS - activeWarning.count > 0 ? (
                <span> متبقي <strong style={{ color: '#f87171' }}>{MAX_VIOLATIONS - activeWarning.count}</strong> تحذير قبل تسليم الامتحان تلقائياً!</span>
              ) : (
                <span> جاري تسليم الامتحان تلقائياً...</span>
              )}
            </div>

            <button
              onClick={handleResumeExam}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 14, fontWeight: 700, background: '#ef4444', borderColor: '#ef4444' }}
            >
              <Maximize2 size={16} /> العودة فوراً لشاشة الامتحان الكاملة
            </button>
          </div>
        </div>
      )}

      {/* Proctoring Security Status Banner */}
      <div style={{
        maxWidth: 720,
        marginBottom: 16,
        padding: '10px 16px',
        borderRadius: 12,
        background: events.length === 0
          ? 'rgba(16,185,129,0.08)'
          : events.length < 3
            ? 'rgba(245,158,11,0.12)'
            : 'rgba(239,68,68,0.14)',
        border: `1px solid ${
          events.length === 0
            ? 'rgba(16,185,129,0.3)'
            : events.length < 3
              ? 'rgba(245,158,11,0.4)'
              : 'rgba(239,68,68,0.45)'
        }`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}>
          {events.length === 0 ? (
            <ShieldCheck size={16} style={{ color: '#10b981' }} />
          ) : (
            <ShieldAlert size={16} style={{ color: events.length < 3 ? '#f59e0b' : '#ef4444' }} />
          )}
          <span style={{ color: 'var(--text-primary)' }}>
            نظام حماية ومراقبة الامتحان مفعّل — ممنوع الخروج من التاب أو تصغير النافذة
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11.5,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 99,
            background: events.length === 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.2)',
            color: events.length === 0 ? '#34d399' : '#f87171',
          }}>
            المخالفات المرصودة: {events.length} / {MAX_VIOLATIONS}
          </span>
          {!isFullscreen && (
            <button
              type="button"
              onClick={requestExamFullscreen}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#a5b4fc',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Maximize2 size={11} /> تكبير الشاشة
            </button>
          )}
        </div>
      </div>

      {/* Top bar */}
      <div className="page-header" style={{ maxWidth: 720 }}>
        <div>
          <h1 className="page-title">الامتحان</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            تمت الإجابة على {answered} من {questions.length}
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
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, maxWidth: 720 }}>
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
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxWidth: 720,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
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
            draggable={false}
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
                    <img src={opt.imageUrl} alt={opt.id} draggable={false} style={{ height: 60, borderRadius: 8, objectFit: 'contain' }} />
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
            placeholder="اكتب إجابتك هنا..."
            value={answers[q.id] || ''}
            onChange={e => setAnswer(q.id, e.target.value)}
            style={{ minHeight: 110, userSelect: 'text', WebkitUserSelect: 'text' }}
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
          <ChevronLeft size={15} /> السابق
        </button>

        {current < questions.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>
            التالي <ChevronRight size={15} />
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
            تسليم الامتحان
          </button>
        )}
      </div>
    </AppShell>
  );
}
