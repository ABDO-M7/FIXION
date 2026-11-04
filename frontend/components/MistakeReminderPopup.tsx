'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { assignmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import {
  Lightbulb, X, RefreshCw, CheckCircle, XCircle,
  BookOpen, Eye, Sparkles, HelpCircle,
} from 'lucide-react';

export interface StudentMistakeItem {
  id: string;
  sourceType: 'QUIZ' | 'VIDEO_CHECKPOINT';
  courseName: string;
  groupName: string;
  enrollmentId: string | null;
  sourceId: string;
  sourceTitle: string;
  chapterName: string | null;
  lessonName: string | null;
  questionId: string;
  questionText: string;
  questionImageUrl: string | null;
  questionType: string;
  options: Array<{ id: string; text: string; imageUrl?: string }>;
  studentAnswer: string | null;
  studentAnswerText: string | null;
  studentAnswerImageUrl: string | null;
  correctAnswer: string;
  correctAnswerText: string;
  correctAnswerImageUrl: string | null;
  explanation: string | null;
  points: number;
  isUnanswered: boolean;
  attempts: number;
  submittedAt: string;
}

function MathText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <span
              key={i}
              style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                background: 'rgba(99,102,241,0.14)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {part.slice(2, -2).trim()}
            </span>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <em key={i} style={{ fontFamily: 'Georgia, serif', color: '#a5b4fc' }}>
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// Initial delay before first popup (10 seconds), then re-pop a random mistake every 3 minutes
const INITIAL_DELAY_MS = 10_000;
const REMINDER_INTERVAL_MS = 180_000;

export default function MistakeReminderPopup() {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const [mistakes, setMistakes] = useState<StudentMistakeItem[]>([]);
  const [currentMistake, setCurrentMistake] = useState<StudentMistakeItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selectedRetryOption, setSelectedRetryOption] = useState<string | null>(null);

  const lastPickedIdRef = useRef<string | null>(null);

  // Never show popup while student is actively taking a quiz or on the mistakes page itself
  const isSuppressedRoute =
    !pathname ||
    pathname.includes('/quiz/') ||
    pathname.startsWith('/student/mistakes') ||
    pathname === '/onboarding';

  const pickRandomMistake = useCallback((list: StudentMistakeItem[]) => {
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const candidates = list.filter(m => m.id !== lastPickedIdRef.current);
    const pool = candidates.length > 0 ? candidates : list;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    lastPickedIdRef.current = picked.id;
    return picked;
  }, []);

  const showRandomPopup = useCallback(
    (list?: StudentMistakeItem[]) => {
      const source = list ?? mistakes;
      if (!source.length) return;
      const picked = pickRandomMistake(source);
      if (!picked) return;
      setCurrentMistake(picked);
      setRevealed(false);
      setSelectedRetryOption(null);
      setIsOpen(true);
    },
    [mistakes, pickRandomMistake],
  );

  // Fetch student mistakes when logged in as student
  useEffect(() => {
    if (!user || user.role !== 'student') return;
    let mounted = true;
    assignmentsApi
      .myMistakes()
      .then(res => {
        if (!mounted) return;
        const data = Array.isArray(res.data) ? (res.data as StudentMistakeItem[]) : [];
        setMistakes(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.role, pathname]);

  // Schedule initial & periodic random reminder popups
  useEffect(() => {
    if (!user || user.role !== 'student' || mistakes.length === 0 || isSuppressedRoute) {
      return;
    }

    const initialTimer = setTimeout(() => {
      showRandomPopup(mistakes);
    }, INITIAL_DELAY_MS);

    const periodicTimer = setInterval(() => {
      showRandomPopup(mistakes);
    }, REMINDER_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
    };
  }, [user, mistakes, isSuppressedRoute, showRandomPopup]);

  if (!user || user.role !== 'student' || mistakes.length === 0 || isSuppressedRoute) {
    return null;
  }

  // Minimized floating pill so student can open a random mistake reminder anytime
  if (!isOpen || !currentMistake) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 22,
          left: 22,
          zIndex: 1100,
        }}
      >
        <button
          type="button"
          onClick={() => showRandomPopup(mistakes)}
          title="راجع غلطة عشوائية من أخطائك السابقة"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 99,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 28px rgba(79,70,229,0.4)',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <Lightbulb size={15} style={{ color: '#fde047' }} />
          <span>تذكير عشوائي من أخطائك ({mistakes.length})</span>
        </button>
      </div>
    );
  }

  const isRetryCorrect =
    selectedRetryOption &&
    selectedRetryOption.trim().toLowerCase() === currentMistake.correctAnswer.trim().toLowerCase();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        left: 22,
        zIndex: 1200,
        width: 'min(420px, calc(100vw - 32px))',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
        border: '1px solid rgba(129,140,248,0.4)',
        borderRadius: 20,
        boxShadow: '0 22px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
        overflow: 'hidden',
        color: '#f8fafc',
      }}
      role="dialog"
      aria-label="تذكير ذكي من أخطائك السابقة"
    >
      {/* Top Banner */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(99,102,241,0.16)',
          borderBottom: '1px solid rgba(129,140,248,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'rgba(250,204,21,0.18)',
              border: '1px solid rgba(250,204,21,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#facc15',
              flexShrink: 0,
            }}
          >
            <Lightbulb size={16} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>تذكير ذكي بغلطتك السابقة</span>
              <Sparkles size={12} style={{ color: '#facc15' }} />
            </div>
            <div style={{ fontSize: 10.5, color: '#a5b4fc' }}>
              {currentMistake.courseName} · {currentMistake.sourceTitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => showRandomPopup(mistakes)}
            title="غلطة عشوائية أخرى"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#cbd5e1',
              borderRadius: 8,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            title="إغلاق التذكير مؤقتاً"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#cbd5e1',
              borderRadius: 8,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', maxHeight: '65vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Question Text */}
        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, color: '#f1f5f9' }}>
          <MathText text={currentMistake.questionText} />
        </div>

        {currentMistake.questionImageUrl && (
          <img
            src={currentMistake.questionImageUrl}
            alt="Question"
            style={{ maxHeight: 140, borderRadius: 8, objectFit: 'contain', alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        )}

        {/* Student's previous wrong answer badge */}
        <div
          style={{
            padding: '8px 11px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.32)',
            fontSize: 12,
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <XCircle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
          <span>
            <strong>إجابتك الخاطئة سابقاً:</strong>{' '}
            {currentMistake.isUnanswered
              ? 'تركت السؤال بدون إجابة'
              : currentMistake.studentAnswerText || currentMistake.studentAnswer || 'إجابة غير صحيحة'}
          </span>
        </div>

        {/* Interactive Options to retry or reveal */}
        {currentMistake.options && currentMistake.options.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              جرّب اختيار الإجابة الصحيحة الآن لتثبيت المعلومة:
            </div>
            {currentMistake.options.map(opt => {
              const isChosen = selectedRetryOption === opt.id;
              const isRight = opt.id.trim().toLowerCase() === currentMistake.correctAnswer.trim().toLowerCase();
              const showRight = revealed || (isChosen && isRight);
              const showWrong = isChosen && !isRight;

              let bg = 'rgba(255,255,255,0.04)';
              let border = 'rgba(255,255,255,0.1)';
              let color = '#e2e8f0';

              if (showRight) {
                bg = 'rgba(16,185,129,0.18)';
                border = '#10b981';
                color = '#34d399';
              } else if (showWrong) {
                bg = 'rgba(239,68,68,0.18)';
                border = '#ef4444';
                color = '#fca5a5';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedRetryOption(opt.id);
                    if (isRight) setRevealed(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 11px',
                    borderRadius: 9,
                    background: bg,
                    border: `1px solid ${border}`,
                    color,
                    fontSize: 12.5,
                    textAlign: 'right',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {opt.id}
                    </span>
                    <span>
                      <MathText text={opt.text} />
                    </span>
                  </div>
                  {showRight && <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />}
                  {showWrong && <XCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Reveal Answer Box */}
        {revealed || isRetryCorrect ? (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(16,185,129,0.14)',
              border: '1px solid rgba(16,185,129,0.4)',
              fontSize: 12.5,
              color: '#6ee7b7',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
              <CheckCircle size={14} />
              <span>
                {isRetryCorrect ? 'أحسنت! إجابتك صحيحة الآن:' : 'الإجابة الصحيحة هي:'}{' '}
                ({currentMistake.correctAnswer}) {currentMistake.correctAnswerText}
              </span>
            </div>
            {currentMistake.explanation && (
              <div style={{ fontSize: 11.5, color: '#d1fae5', marginTop: 2 }}>
                الشرح: {currentMistake.explanation}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            style={{
              background: 'rgba(99,102,241,0.16)',
              border: '1px solid rgba(99,102,241,0.35)',
              color: '#c7d2fe',
              borderRadius: 9,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Eye size={13} /> إظهار الإجابة الصحيحة فوراً
          </button>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: '10px 16px',
          background: 'rgba(15,23,42,0.75)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Link
          href="/student/mistakes"
          onClick={() => setIsOpen(false)}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#a5b4fc',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <BookOpen size={13} /> كل أخطائي ({mistakes.length})
        </Link>

        <button
          type="button"
          onClick={() => showRandomPopup(mistakes)}
          style={{
            background: '#4f46e5',
            border: 'none',
            color: '#ffffff',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <RefreshCw size={12} /> سؤال آخر عشوائي
        </button>
      </div>
    </div>
  );
}

