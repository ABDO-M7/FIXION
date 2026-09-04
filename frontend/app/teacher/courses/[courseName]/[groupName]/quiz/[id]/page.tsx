'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi, uploadsApi } from '@/lib/api';
import {
  ArrowLeft, Plus, Trash2, X, Save, Eye, EyeOff,
  Image as ImageIcon, Type, CheckCircle, GripVertical,
  ChevronUp, ChevronDown, BookOpen, Edit3, Send
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ── LaTeX / Math renderer (pure CSS, no dep) ─────────────────────────────────
// We render LaTeX inline using a simple approach: text between $$ is shown in a
// styled monospace block. For full rendering, KaTeX can be added later.
function MathText({ text }: { text: string }) {
  // Split on $$...$$ blocks
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <span key={i} style={{
              fontFamily: 'Georgia, serif', fontStyle: 'italic',
              background: 'rgba(99,102,241,0.1)', padding: '2px 6px',
              borderRadius: 4, fontSize: '0.95em',
            }}>
              {part.slice(2, -2).trim()}
            </span>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <em key={i} style={{
              fontFamily: 'Georgia, serif',
              color: 'var(--primary-light)',
            }}>
              {part.slice(1, -1).trim()}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

const OPTION_IDS = ['A', 'B', 'C', 'D'];

type Option = { id: string; text: string; imageUrl: string };
type Question = {
  id?: string;
  questionText: string;
  questionImageUrl: string;
  type: 'MULTIPLE_CHOICE' | 'TEXT';
  options: Option[];
  correctAnswer: string;
  points: number;
  orderIndex: number;
};

const blankQuestion = (index: number): Question => ({
  questionText: '',
  questionImageUrl: '',
  type: 'MULTIPLE_CHOICE',
  options: OPTION_IDS.map(id => ({ id, text: '', imageUrl: '' })),
  correctAnswer: '',
  points: 1,
  orderIndex: index,
});

export default function QuizBuilderPage() {
  const { courseName, groupName, id } = useParams<{ courseName: string; groupName: string; id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [imgUploading, setImgUploading] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const optImgRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const cn = decodeURIComponent(courseName);
  const gn = decodeURIComponent(groupName);

  // Load existing quiz + questions
  useEffect(() => {
    Promise.all([
      assignmentsApi.list(cn, gn),
      assignmentsApi.getQuestions(id),
    ]).then(([assignRes, qRes]) => {
      const found = (assignRes.data as any[]).find((a: any) => a.id === id);
      setAssignment(found || null);
      const loaded: Question[] = (qRes.data as any[]).map((q: any) => ({
        ...q,
        options: q.options?.length === 4 ? q.options : OPTION_IDS.map(oid => ({ id: oid, text: '', imageUrl: '' })),
      }));
      if (loaded.length > 0) setQuestions(loaded);
      else setQuestions([blankQuestion(0)]);
    }).catch(() => toast.error('Failed to load quiz'));
  }, [id]);

  const current = questions[selected] ?? blankQuestion(0);

  const updateCurrent = (patch: Partial<Question>) => {
    setQuestions(prev => prev.map((q, i) => i === selected ? { ...q, ...patch } : q));
  };

  const updateOption = (optId: string, patch: Partial<Option>) => {
    updateCurrent({
      options: current.options.map(o => o.id === optId ? { ...o, ...patch } : o),
    });
  };

  const addQuestion = () => {
    const nq = blankQuestion(questions.length);
    setQuestions(prev => [...prev, nq]);
    setSelected(questions.length);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) { toast.error('Need at least one question'); return; }
    setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderIndex: i })));
    setSelected(Math.min(idx, questions.length - 2));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= questions.length) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((q, i) => ({ ...q, orderIndex: i }));
    });
    setSelected(next);
  };

  const uploadImage = async (file: File, target: 'question' | string) => {
    setImgUploading(target);
    try {
      const res = await uploadsApi.upload(file);
      const url = res.data.url;
      if (target === 'question') updateCurrent({ questionImageUrl: url });
      else updateOption(target, { imageUrl: url });
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setImgUploading(null);
    }
  };

  // Save all questions to backend
  const saveAll = async () => {
    if (questions.some(q => !q.questionText.trim())) {
      toast.error('All questions need text');
      return;
    }
    setSaving(true);
    try {
      // Fetch existing saved question IDs
      const existingRes = await assignmentsApi.getQuestions(id);
      const existingIds = new Set((existingRes.data as any[]).map((q: any) => q.id));

      for (const q of questions) {
        const payload = {
          questionText: q.questionText,
          questionImageUrl: q.questionImageUrl || null,
          type: q.type,
          options: q.type === 'MULTIPLE_CHOICE' ? q.options : [],
          correctAnswer: q.correctAnswer || null,
          points: q.points,
          orderIndex: q.orderIndex,
        };
        if (q.id && existingIds.has(q.id)) {
          await assignmentsApi.updateQuestion(id, q.id, payload);
        } else {
          const res = await assignmentsApi.createQuestion(id, payload);
          // update local id
          setQuestions(prev => prev.map(pq =>
            pq === q ? { ...pq, id: (res.data as any).id } : pq
          ));
        }
      }
      toast.success('Quiz saved! ✅');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const publishQuiz = async () => {
    // Basic frontend validation to save a request
    const missingAnswers = questions.some(q => q.type === 'MULTIPLE_CHOICE' && !q.correctAnswer);
    if (missingAnswers) {
      toast.error('Cannot publish: All multiple-choice questions must have a correct answer assigned.');
      return;
    }
    
    setPublishing(true);
    try {
      // Ensure it is saved first
      await saveAll();
      await assignmentsApi.publish(id);
      setAssignment((prev: any) => ({ ...prev, isPublished: true }));
      toast.success('Quiz published successfully! It is now visible to students. 🎉');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0);

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header">
        <div>
          <Link
            href={`/teacher/courses/${courseName}/${groupName}`}
            className="btn btn-ghost btn-sm"
            style={{ paddingLeft: 0, marginBottom: 8 }}
          >
            <ArrowLeft size={14} /> Back to Group
          </Link>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            📝 {assignment?.title || 'Quiz Builder'}
          </h1>
          <p className="page-subtitle">
            {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} total points · Max grade: {assignment?.maxGrade ?? 100}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {assignment?.isPublished && (
            <span className="badge badge-answered" style={{ padding: '6px 12px', fontSize: 13, marginRight: 8 }}>
              Published
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setPreview(p => !p)}
          >
            {preview ? <Edit3 size={15} /> : <Eye size={15} />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={saveAll}
            disabled={saving || publishing}
          >
            {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Save size={15} />}
            Save
          </button>
          {!assignment?.isPublished && (
            <button
              className="btn btn-primary"
              onClick={publishQuiz}
              disabled={publishing || saving}
              title="Publish so students can see it"
            >
              {publishing ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Send size={15} />}
              Publish Quiz
            </button>
          )}
        </div>
      </div>

      {preview ? (
        // ── Preview Mode ───────────────────────────────────────────────────
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.map((q, idx) => (
            <div key={idx} className="card" style={{ gap: 14, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, color: '#a5b4fc',
                }}>Q{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.6 }}>
                    <MathText text={q.questionText} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {q.points} point{q.points !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {q.questionImageUrl && (
                <img src={q.questionImageUrl} alt="Question" style={{ maxHeight: 220, borderRadius: 8, objectFit: 'contain' }} />
              )}
              {q.type === 'MULTIPLE_CHOICE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map(opt => (
                    <div key={opt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${opt.id === q.correctAnswer ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                      background: opt.id === q.correctAnswer ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: opt.id === q.correctAnswer ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12,
                        color: opt.id === q.correctAnswer ? '#34d399' : 'var(--text-muted)',
                      }}>{opt.id}</div>
                      <div style={{ flex: 1, fontSize: 14 }}>
                        {opt.text ? <MathText text={opt.text} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                      {opt.imageUrl && <img src={opt.imageUrl} alt={opt.id} style={{ height: 48, borderRadius: 6 }} />}
                      {opt.id === q.correctAnswer && <CheckCircle size={16} style={{ color: '#34d399', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'TEXT' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
                  Student writes their answer here…
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // ── Edit Mode ──────────────────────────────────────────────────────
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Left: question list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {questions.map((q, idx) => (
              <div
                key={idx}
                onClick={() => setSelected(idx)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${selected === idx ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                  background: selected === idx ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: selected === idx ? 'var(--primary-light)' : 'var(--text-muted)', marginBottom: 2 }}>
                    Q{idx + 1} · {q.points}pt
                  </div>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: q.questionText ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {q.questionText || 'No text yet…'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button onClick={e => { e.stopPropagation(); moveQuestion(idx, -1); }} className="icon-btn" style={{ width: 20, height: 20 }}><ChevronUp size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); moveQuestion(idx, 1); }} className="icon-btn" style={{ width: 20, height: 20 }}><ChevronDown size={12} /></button>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addQuestion} style={{ marginTop: 4 }}>
              <Plus size={14} /> Add Question
            </button>
          </div>

          {/* Right: question editor */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Question {selected + 1}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Type toggle */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {(['MULTIPLE_CHOICE', 'TEXT'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => updateCurrent({ type: t })}
                      style={{
                        padding: '6px 12px', fontSize: 12, fontWeight: 600,
                        background: current.type === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: current.type === t ? 'var(--primary-light)' : 'var(--text-muted)',
                        border: 'none', cursor: 'pointer', transition: 'var(--transition)',
                      }}
                    >
                      {t === 'MULTIPLE_CHOICE' ? '🔘 MCQ' : '✏️ Text'}
                    </button>
                  ))}
                </div>
                <button
                  className="icon-btn"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => removeQuestion(selected)}
                  title="Delete question"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Question text */}
            <div className="form-group">
              <label className="form-label">
                Question Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(supports LaTeX: $x^2$ or $$\frac{"{a}{b}"}$$)</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={current.questionText}
                onChange={e => updateCurrent({ questionText: e.target.value })}
                placeholder="Type your question... Use $math$ for inline LaTeX"
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
              />
              {current.questionText && (
                <div style={{ fontSize: 13, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)', marginTop: 6, lineHeight: 1.7 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PREVIEW</span>
                  <MathText text={current.questionText} />
                </div>
              )}
            </div>

            {/* Question image */}
            <div className="form-group">
              <label className="form-label">Question Image (optional)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => imgRef.current?.click()}
                  disabled={imgUploading === 'question'}
                >
                  {imgUploading === 'question'
                    ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                    : <ImageIcon size={13} />}
                  {current.questionImageUrl ? 'Change Image' : 'Upload Image'}
                </button>
                {current.questionImageUrl && (
                  <>
                    <img src={current.questionImageUrl} alt="Q" style={{ height: 48, borderRadius: 6, objectFit: 'contain' }} />
                    <button className="icon-btn" onClick={() => updateCurrent({ questionImageUrl: '' })} style={{ color: 'var(--danger)' }}><X size={14} /></button>
                  </>
                )}
                <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'question')} />
              </div>
            </div>

            {/* MCQ options */}
            {current.type === 'MULTIPLE_CHOICE' && (
              <div className="form-group">
                <label className="form-label">Options <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— click the circle to mark correct answer</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {current.options.map(opt => (
                    <div key={opt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${opt.id === current.correctAnswer ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                      background: opt.id === current.correctAnswer ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                    }}>
                      {/* Correct marker */}
                      <button
                        onClick={() => updateCurrent({ correctAnswer: opt.id === current.correctAnswer ? '' : opt.id })}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: 'none',
                          background: opt.id === current.correctAnswer ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)',
                          color: opt.id === current.correctAnswer ? '#34d399' : 'var(--text-muted)',
                          fontWeight: 800, fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'var(--transition)',
                        }}
                        title="Mark as correct"
                      >
                        {opt.id === current.correctAnswer ? <CheckCircle size={14} /> : opt.id}
                      </button>

                      {/* Option text */}
                      <input
                        className="form-input"
                        style={{ flex: 1, padding: '7px 10px', fontSize: 13 }}
                        value={opt.text}
                        onChange={e => updateOption(opt.id, { text: e.target.value })}
                        placeholder={`Option ${opt.id}`}
                      />

                      {/* Option image */}
                      <button
                        className="icon-btn"
                        style={{ flexShrink: 0 }}
                        title="Add image to option"
                        onClick={() => optImgRefs.current[opt.id]?.click()}
                        disabled={imgUploading === opt.id}
                      >
                        {imgUploading === opt.id
                          ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                          : opt.imageUrl
                            ? <img src={opt.imageUrl} alt={opt.id} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                            : <ImageIcon size={14} />}
                      </button>
                      <input
                        ref={el => { optImgRefs.current[opt.id] = el; }}
                        type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], opt.id)}
                      />
                      {opt.imageUrl && (
                        <button className="icon-btn" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => updateOption(opt.id, { imageUrl: '' })}><X size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEXT type hint */}
            {current.type === 'TEXT' && (
              <div className="form-group">
                <label className="form-label">Model Answer (for auto-grading)</label>
                <input
                  className="form-input"
                  value={current.correctAnswer}
                  onChange={e => updateCurrent({ correctAnswer: e.target.value })}
                  placeholder="Enter expected answer (exact match required)"
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Student's answer must match exactly (case-insensitive). Leave blank to skip auto-grading for this question.
                </div>
              </div>
            )}

            {/* Points */}
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label">Points for this question</label>
              <input
                type="number" min={1} max={100}
                className="form-input"
                value={current.points}
                onChange={e => updateCurrent({ points: Math.max(1, +e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
