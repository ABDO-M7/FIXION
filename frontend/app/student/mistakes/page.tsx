'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import { assignmentsApi, aiApi } from '@/lib/api';
import type { StudentMistakeItem } from '@/components/MistakeReminderPopup';
import {
  AlertTriangle, BookOpen, CheckCircle, XCircle, RefreshCw,
  Search, Sparkles, Video, ClipboardList, ExternalLink, Eye,
  ChevronLeft, ChevronRight, Lightbulb, Cpu, Target, ListChecks,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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
                background: 'rgba(99,102,241,0.12)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {part.slice(2, -2).trim()}
            </span>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <em key={i} style={{ fontFamily: 'Georgia, serif', color: 'var(--primary-light)' }}>
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function StudentMistakesPage() {
  const [mistakes, setMistakes] = useState<StudentMistakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'QUIZ' | 'VIDEO_CHECKPOINT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: 'LIST' (all mistakes with answers) or 'PRACTICE' (interactive flashcard quiz on mistakes)
  const [mode, setMode] = useState<'LIST' | 'PRACTICE'>('LIST');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceChoice, setPracticeChoice] = useState<string | null>(null);
  const [practiceRevealed, setPracticeRevealed] = useState(false);

  // AI Diagnostic Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  const handleAnalyzeMistakes = async () => {
    setAnalyzing(true);
    try {
      const res = await aiApi.analyzeMistakes(selectedCourse);
      setAiReport(res.data);
      toast.success('تم تحليل أخطائك بالذكاء الاصطناعي وتحديد نقاط ضعفك وخطة مذاكرتك!');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل تحليل الأخطاء بالذكاء الاصطناعي');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    assignmentsApi
      .myMistakes()
      .then(res => {
        const list = Array.isArray(res.data) ? (res.data as StudentMistakeItem[]) : [];
        setMistakes(list);
      })
      .catch(() => toast.error('فشل تحميل بنك الأخطاء'))
      .finally(() => setLoading(false));
  }, []);

  const courses = useMemo(() => {
    return [...new Set(mistakes.map(m => m.courseName))];
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mistakes.filter(m => {
      if (selectedCourse !== 'ALL' && m.courseName !== selectedCourse) return false;
      if (selectedType !== 'ALL' && m.sourceType !== selectedType) return false;
      if (q) {
        const hay = [
          m.questionText,
          m.courseName,
          m.sourceTitle,
          m.chapterName,
          m.lessonName,
          m.studentAnswerText,
          m.correctAnswerText,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [mistakes, selectedCourse, selectedType, searchQuery]);

  const quizMistakesCount = useMemo(
    () => mistakes.filter(m => m.sourceType === 'QUIZ').length,
    [mistakes],
  );
  const videoMistakesCount = useMemo(
    () => mistakes.filter(m => m.sourceType === 'VIDEO_CHECKPOINT').length,
    [mistakes],
  );

  const pickRandomPractice = () => {
    if (filteredMistakes.length <= 1) return;
    let next = Math.floor(Math.random() * filteredMistakes.length);
    if (next === practiceIndex) {
      next = (practiceIndex + 1) % filteredMistakes.length;
    }
    setPracticeIndex(next);
    setPracticeChoice(null);
    setPracticeRevealed(false);
  };

  const practiceItem = filteredMistakes[practiceIndex] || filteredMistakes[0] || null;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
            بنك أخطائي والمراجعة الذكية
          </h1>
          <p className="page-subtitle">
            كل الأسئلة التي أخطأت فيها في الامتحانات والكويزات وأسئلة الحصص مجمّعة هنا لمراجعتها والتدرب عليها حتى لا تكرر نفس الخطأ.
          </p>
        </div>

        {mistakes.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleAnalyzeMistakes}
              disabled={analyzing}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderColor: '#10b981',
                boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
              }}
            >
              {analyzing ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span>جاري تحليل أخطائك بالـ AI...</span>
                </>
              ) : (
                <>
                  <img
                    src="/brand/fixion-mascot-avatar.png"
                    alt="Fixion AI"
                    style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span>حلّل أخطائي بالـ AI (اعرف الدروس الضعيفة وخطة المذاكرة)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('LIST');
              }}
              className={`btn ${mode === 'LIST' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <BookOpen size={15} /> سجل الأخطاء بالتفصيل ({filteredMistakes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('PRACTICE');
                setPracticeIndex(0);
                setPracticeChoice(null);
                setPracticeRevealed(false);
              }}
              className={`btn ${mode === 'PRACTICE' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Sparkles size={15} /> درّب نفسك عشوائياً على أخطائك
            </button>
          </div>
        )}
      </div>

      {/* AI Diagnostic Report Card */}
      {aiReport && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            border: '1.5px solid rgba(16,185,129,0.45)',
            background: 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(16,185,129,0.07))',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/brand/fixion-mascot-explaining.png"
                alt="Fixion AI Explaining"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  objectFit: 'cover',
                  border: '2px solid rgba(16,185,129,0.5)',
                  flexShrink: 0,
                }}
              />
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>تقرير المستشار الذكي لتشخيص نقاط ضعفك وخطة مذاكرتك</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: 'rgba(16,185,129,0.18)',
                      color: '#34d399',
                    }}
                  >
                    AI Diagnosis
                  </span>
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {aiReport.summary}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAiReport(null)}
              className="btn btn-ghost btn-sm"
            >
              إخفاء التقرير
            </button>
          </div>

          {/* Weak Lessons / Topics */}
          {Array.isArray(aiReport.weakTopics) && aiReport.weakTopics.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fca5a5', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={16} /> الدروس والوحدات التي تحتاج منك تركيزاً ومراجعة عاجلة:
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {aiReport.weakTopics.map((wt: any, idx: number) => {
                  const sevColor =
                    wt.severity === 'HIGH' ? '#ef4444' : wt.severity === 'MEDIUM' ? '#f59e0b' : '#38bdf8';
                  const sevLabel =
                    wt.severity === 'HIGH' ? 'أولوية قصوى 🔥' : wt.severity === 'MEDIUM' ? 'أولوية متوسطة ⚠️' : 'مراجعة سريعة 💡';

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(15,23,42,0.85)',
                        border: `1px solid ${sevColor}55`,
                        borderTop: `3px solid ${sevColor}`,
                        borderRadius: 12,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 14, color: '#f8fafc' }}>{wt.lessonOrChapter}</strong>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: `${sevColor}22`,
                            color: sevColor,
                            flexShrink: 0,
                          }}
                        >
                          {sevLabel} ({wt.mistakeCount} أخطاء)
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>المادة: {wt.courseName}</div>
                      <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                        <strong style={{ color: '#fca5a5' }}>سبب الخطأ: </strong>
                        {wt.whyWeak}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: '#d1fae5',
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          padding: '8px 10px',
                          borderRadius: 8,
                          lineHeight: 1.55,
                        }}
                      >
                        <strong style={{ color: '#34d399' }}>ماذا تذاكر؟ </strong>
                        {wt.whatToStudy}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Concept Reviews & Action Plan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {Array.isArray(aiReport.conceptReviews) && aiReport.conceptReviews.length > 0 && (
              <div
                style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#a5b4fc', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lightbulb size={15} /> ملخص تصحيح المفاهيم العلمية:
                </h4>
                <ul style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 }}>
                  {aiReport.conceptReviews.map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(aiReport.actionPlan) && aiReport.actionPlan.length > 0 && (
              <div
                style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(16,185,129,0.35)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ListChecks size={15} /> خطة المذاكرة المقترحة لك خطوة بخطوة:
                </h4>
                <ol style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#d1fae5', lineHeight: 1.6 }}>
                  {aiReport.actionPlan.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={22} style={{ color: '#f87171' }} />
          </div>
          <div className="stat-value">{mistakes.length}</div>
          <div className="stat-label">إجمالي الأخطاء المسجلة</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <ClipboardList size={22} style={{ color: 'var(--primary-light)' }} />
          </div>
          <div className="stat-value">{quizMistakesCount}</div>
          <div className="stat-label">أخطاء الكويزات والامتحانات</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Video size={22} style={{ color: '#fbbf24' }} />
          </div>
          <div className="stat-value">{videoMistakesCount}</div>
          <div className="stat-label">أخطاء أسئلة الفيديو</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <BookOpen size={22} style={{ color: '#34d399' }} />
          </div>
          <div className="stat-value">{courses.length}</div>
          <div className="stat-label">المواد المسجلة</div>
        </div>
      </div>

      {/* Filter Bar */}
      {mistakes.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Type filter */}
            {[
              { id: 'ALL' as const, label: 'كل الأخطاء' },
              { id: 'QUIZ' as const, label: 'الكويزات والامتحانات' },
              { id: 'VIDEO_CHECKPOINT' as const, label: 'أسئلة الفيديو' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedType(tab.id);
                  setPracticeIndex(0);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: selectedType === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: selectedType === tab.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}

            {/* Course dropdown */}
            {courses.length > 1 && (
              <select
                value={selectedCourse}
                onChange={e => {
                  setSelectedCourse(e.target.value);
                  setPracticeIndex(0);
                }}
                className="form-input"
                style={{ width: 'auto', minWidth: 150, padding: '6px 12px', fontSize: 12.5 }}
              >
                <option value="ALL">كل المواد ({courses.length})</option>
                {courses.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ position: 'relative', minWidth: 230, flex: '0 1 280px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="ابحث في نص السؤال أو اسم الامتحان..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12.5 }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="page-loader">
          <span className="spinner" />
        </div>
      ) : mistakes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              margin: '0 auto 16px',
              background: 'rgba(16,185,129,0.14)',
              border: '1px solid rgba(16,185,129,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <CheckCircle size={36} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>لا توجد أخطاء مسجلة حتى الآن! 🎉</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 460, margin: '0 auto 20px' }}>
            عندما تحل أي كويز أو امتحان أو سؤال تفاعلي داخل الحصص وتخطئ في أي سؤال، سيظهر هنا تلقائياً مع الإجابة الصحيحة لتراجعه في أي وقت.
          </p>
          <Link href="/student/courses" className="btn btn-primary">
            <BookOpen size={15} /> تصفح كورساتي
          </Link>
        </div>
      ) : filteredMistakes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '44px 24px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا توجد أخطاء مطابقة للفلتر الحالي</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>جرّب تغيير البحث أو اختيار مادة أخرى.</p>
        </div>
      ) : mode === 'PRACTICE' && practiceItem ? (
        /* ── Interactive Practice / Flashcard Mode ───────────────────────────── */
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div
            className="card"
            style={{
              padding: '28px 24px',
              border: '1px solid rgba(99,102,241,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: 'rgba(99,102,241,0.16)',
                    color: '#a5b4fc',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  سؤال {practiceIndex + 1} من {filteredMistakes.length}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {practiceItem.courseName} · {practiceItem.sourceTitle}
                </span>
              </div>

              <button
                type="button"
                onClick={pickRandomPractice}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={13} /> اختر غلطة عشوائية
              </button>
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.65 }}>
              <MathText text={practiceItem.questionText} />
            </div>

            {practiceItem.questionImageUrl && (
              <img
                src={practiceItem.questionImageUrl}
                alt="Question"
                style={{ maxHeight: 240, borderRadius: 10, objectFit: 'contain', alignSelf: 'flex-start' }}
              />
            )}

            <div
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                fontSize: 12,
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Lightbulb size={15} />
              <span>
                في المرة السابقة اخترت:{' '}
                <strong>
                  {practiceItem.isUnanswered
                    ? 'لم تجب على السؤال'
                    : practiceItem.studentAnswerText || practiceItem.studentAnswer}
                </strong>{' '}
                — حاول اختيار الإجابة الصحيحة الآن!
              </span>
            </div>

            {practiceItem.options && practiceItem.options.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {practiceItem.options.map(opt => {
                  const isChosen = practiceChoice === opt.id;
                  const isRight = opt.id.trim().toLowerCase() === practiceItem.correctAnswer.trim().toLowerCase();
                  const showRight = practiceRevealed || (isChosen && isRight);
                  const showWrong = isChosen && !isRight;

                  let bg = 'rgba(255,255,255,0.03)';
                  let border = 'var(--border)';
                  let color = 'var(--text-primary)';

                  if (showRight) {
                    bg = 'rgba(16,185,129,0.15)';
                    border = '#10b981';
                    color = '#34d399';
                  } else if (showWrong) {
                    bg = 'rgba(239,68,68,0.15)';
                    border = '#ef4444';
                    color = '#f87171';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPracticeChoice(opt.id);
                        if (isRight) setPracticeRevealed(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: bg,
                        border: `2px solid ${border}`,
                        color,
                        cursor: 'pointer',
                        textAlign: 'right',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {opt.id}
                        </span>
                        <span>
                          <MathText text={opt.text} />
                        </span>
                      </div>
                      {showRight && <CheckCircle size={17} style={{ color: '#10b981' }} />}
                      {showWrong && <XCircle size={17} style={{ color: '#ef4444' }} />}
                    </button>
                  );
                })}
              </div>
            )}

            {practiceRevealed ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  color: '#34d399',
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                ✓ الإجابة الصحيحة: ({practiceItem.correctAnswer}) {practiceItem.correctAnswerText}
                {practiceItem.explanation && (
                  <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 500, color: '#d1fae5' }}>
                    💡 التوضيح: {practiceItem.explanation}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPracticeRevealed(true)}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-start' }}
              >
                <Eye size={14} /> إظهار الإجابة الصحيحة
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={practiceIndex === 0}
                onClick={() => {
                  setPracticeIndex(i => Math.max(0, i - 1));
                  setPracticeChoice(null);
                  setPracticeRevealed(false);
                }}
              >
                <ChevronRight size={15} /> السابق
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={practiceIndex >= filteredMistakes.length - 1}
                onClick={() => {
                  setPracticeIndex(i => Math.min(filteredMistakes.length - 1, i + 1));
                  setPracticeChoice(null);
                  setPracticeRevealed(false);
                }}
              >
                التالي <ChevronLeft size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Detailed Mistakes List ──────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredMistakes.map((m, idx) => {
            const targetHref =
              m.enrollmentId && m.sourceType === 'QUIZ'
                ? `/student/courses/${m.enrollmentId}/quiz/${m.sourceId}`
                : m.enrollmentId && m.sourceType === 'VIDEO_CHECKPOINT'
                  ? `/student/courses/${m.enrollmentId}/videos/${m.sourceId}`
                  : m.enrollmentId
                    ? `/student/courses/${m.enrollmentId}`
                    : '/student/courses';

            return (
              <div
                key={m.id}
                className="card"
                style={{
                  borderLeft: '4px solid #ef4444',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {/* Header Metadata */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: 'rgba(239,68,68,0.15)',
                        color: '#f87171',
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      خطأ #{idx + 1}
                    </span>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        background:
                          m.sourceType === 'QUIZ'
                            ? 'rgba(99,102,241,0.16)'
                            : 'rgba(245,158,11,0.16)',
                        color: m.sourceType === 'QUIZ' ? '#a5b4fc' : '#fbbf24',
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {m.sourceType === 'QUIZ' ? 'كويز / امتحان' : 'سؤال تفاعلي بالحصة'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {m.courseName} — {m.sourceTitle}
                    </span>
                    {(m.chapterName || m.lessonName) && (
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        ({[m.chapterName, m.lessonName].filter(Boolean).join(' · ')})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.submittedAt && (
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {format(new Date(m.submittedAt), 'yyyy/MM/dd HH:mm')}
                      </span>
                    )}
                    <Link href={targetHref} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                      <span>فتح المصدر</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {/* Question Text */}
                <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.65 }}>
                  <MathText text={m.questionText} />
                </div>

                {m.questionImageUrl && (
                  <img
                    src={m.questionImageUrl}
                    alt="Question"
                    style={{ maxHeight: 220, borderRadius: 10, objectFit: 'contain', alignSelf: 'flex-start' }}
                  />
                )}

                {/* Comparison of Student Wrong Answer vs Correct Answer */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 12,
                  }}
                >
                  {/* Student Wrong Answer */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <XCircle size={13} /> إجابتك الخاطئة
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fca5a5' }}>
                      {m.isUnanswered ? (
                        'لم تتم الإجابة على السؤال'
                      ) : (
                        <>
                          {m.studentAnswer ? `(${m.studentAnswer}) ` : ''}
                          <MathText text={m.studentAnswerText || m.studentAnswer || '—'} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Correct Answer */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={13} /> الإجابة الصحيحة المعتمدة
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#6ee7b7' }}>
                      ({m.correctAnswer}) <MathText text={m.correctAnswerText || m.correctAnswer} />
                    </div>
                  </div>
                </div>

                {m.explanation && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.28)',
                      fontSize: 12.5,
                      color: '#c7d2fe',
                    }}
                  >
                    💡 <strong>التوضيح والشرح:</strong> {m.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

