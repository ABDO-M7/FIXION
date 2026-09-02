'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { enrollmentsApi, assignmentsApi, uploadsApi } from '@/lib/api';
import {
  GraduationCap, User, Users, ArrowLeft, BookOpen,
  ClipboardList, Upload, X, FileText, Image, CheckCircle,
  Clock, Loader2, ExternalLink, Star,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا': '#6366f1',
  'رياضه': '#10b981',
  'احصاء': '#f59e0b',
  'عربي':  '#ef4444',
  'برمجه': '#8b5cf6',
};

type Assignment = {
  id: string;
  type: 'HOMEWORK' | 'QUIZ';
  title: string;
  description?: string;
  dueDate?: string;
  maxGrade: number;
  submission: {
    id: string;
    content: string;
    attachments: string[];
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
  } | null;
};

// ── File icon by type ──────────────────────────────────────────────────────────
function FileIcon({ url }: { url: string }) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText size={14} style={{ color: '#ef4444' }} />;
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return <FileText size={14} style={{ color: '#3b82f6' }} />;
  return <Image size={14} style={{ color: '#10b981' }} />;
}

function fileName(url: string) {
  try {
    const parts = new URL(url).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url.split('/').pop() || 'file';
  }
}

// ── Submit Modal ───────────────────────────────────────────────────────────────
function SubmitModal({
  assignment,
  onClose,
  onSubmitted,
}: {
  assignment: Assignment;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [content, setContent] = useState(assignment.submission?.content || '');
  const [files, setFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>(assignment.submission?.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const valid: File[] = [];
    Array.from(selected).forEach(f => {
      if (!allowed.includes(f.type)) { toast.error(`${f.name}: unsupported file type`); return; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: must be under 10MB`); return; }
      valid.push(f);
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, []);

  const submit = async () => {
    if (!content.trim() && files.length === 0 && existingUrls.length === 0) {
      toast.error('Add a note or attach at least one file');
      return;
    }

    setSaving(true);
    setUploading(true);
    let uploadedUrls: string[] = [...existingUrls];

    try {
      // Upload each new file
      for (const file of files) {
        const res = await uploadsApi.upload(file);
        uploadedUrls.push(res.data.url);
      }
      setUploading(false);

      // Submit to the assignment
      await assignmentsApi.submit(assignment.id, {
        content: content.trim(),
        attachments: uploadedUrls,
      });

      toast.success('Submitted successfully! ✅');
      onSubmitted();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Submission failed';
      toast.error(msg);
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  const isUpdate = !!assignment.submission;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {isUpdate ? '✏️ Update Submission' : '📤 Submit Assignment'}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{assignment.title}</div>
          </div>
          <button onClick={onClose} className="icon-btn" style={{ flexShrink: 0 }}><X size={16} /></button>
        </div>

        {/* Note */}
        <div className="form-group">
          <label className="form-label">Add a note (optional)</label>
          <textarea
            className="form-input form-textarea"
            placeholder="Write anything you want to tell your teacher…"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: 90 }}
          />
        </div>

        {/* Drag-drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition)',
            background: 'rgba(255,255,255,0.02)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Upload size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop files here or click to browse</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, Word, JPG, PNG, GIF — max 10MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Existing attachments (from prior submission) */}
        {existingUrls.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Previously uploaded</div>
            {existingUrls.map((url, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <FileIcon url={url} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName(url)}</span>
                <a href={url} target="_blank" rel="noreferrer" className="icon-btn" style={{ width: 26, height: 26 }}><ExternalLink size={13} /></a>
                <button onClick={() => setExistingUrls(prev => prev.filter((_, j) => j !== i))} className="icon-btn" style={{ width: 26, height: 26, color: 'var(--danger)' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {/* New files queued */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Files to upload ({files.length})</div>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(99,102,241,0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                <FileIcon url={f.name} />
                <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{(f.size / 1024).toFixed(0)}KB</span>
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="icon-btn" style={{ width: 26, height: 26, color: 'var(--danger)' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? (
              <>
                {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                {uploading ? ' Uploading…' : ' Saving…'}
              </>
            ) : (
              <>{isUpdate ? '✏️ Update' : '📤 Submit'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assignment Card ────────────────────────────────────────────────────────────
function AssignmentCard({
  assignment,
  courseId,
  onRefresh,
}: {
  assignment: Assignment;
  courseId: string;
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const sub = assignment.submission;
  const isHw = assignment.type === 'HOMEWORK';
  const maxGrade = assignment.maxGrade ?? 100;

  return (
    <>
      <div
        className="card"
        style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          borderLeft: sub ? '3px solid rgba(16,185,129,0.6)' : '3px solid rgba(245,158,11,0.4)',
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: isHw ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isHw
              ? <BookOpen size={20} style={{ color: '#f59e0b' }} />
              : <ClipboardList size={20} style={{ color: '#6366f1' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{assignment.title}</div>
            {assignment.description && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{assignment.description}</div>
            )}
          </div>
          {/* Grade badge */}
          {sub?.grade !== null && sub?.grade !== undefined ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 20, padding: '4px 12px',
            }}>
              <Star size={12} style={{ color: '#10b981' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{sub.grade} / {maxGrade}</span>
            </div>
          ) : sub ? (
            <span className="badge badge-answered"><CheckCircle size={11} style={{ marginRight: 3 }} />Submitted</span>
          ) : (
            <span className="badge badge-pending"><Clock size={11} style={{ marginRight: 3 }} />Not submitted</span>
          )}
        </div>

        {/* Submission details */}
        {sub && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 10,
            border: '1px solid var(--border)', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your Submission
            </div>
            {sub.content && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{sub.content}</p>
            )}
            {sub.attachments?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sub.attachments.map((url, i) => (
                  <a
                    key={i} href={url} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 6, padding: '5px 10px', fontSize: 12,
                      color: 'var(--primary-light)', textDecoration: 'none',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.16)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                  >
                    <FileIcon url={url} />
                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName(url)}</span>
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            )}
            {sub.feedback && (
              <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', borderLeft: '3px solid rgba(99,102,241,0.4)' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>Teacher feedback: </span>
                {sub.feedback}
              </div>
            )}
          </div>
        )}

        {/* Action button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {assignment.type === 'QUIZ' ? (
            <Link
              href={`/student/courses/${courseId}/quiz/${assignment.id}`}
              className={`btn ${sub ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            >
              <ClipboardList size={13} />
              {sub ? 'Retake Quiz' : 'Take Quiz'}
            </Link>
          ) : (
            <button
              className={`btn ${sub ? 'btn-secondary' : 'btn-primary'} btn-sm`}
              onClick={() => setShowModal(true)}
            >
              <Upload size={13} />
              {sub ? 'Update Submission' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <SubmitModal
          assignment={assignment}
          onClose={() => setShowModal(false)}
          onSubmitted={onRefresh}
        />
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'homework' | 'quiz'>('homework');

  const loadAssignments = useCallback(async (courseName: string, groupName: string) => {
    const res = await assignmentsApi.myAssignments(courseName, groupName);
    setAssignments(res.data);
  }, []);

  useEffect(() => {
    enrollmentsApi.one(id)
      .then(async r => {
        setEnrollment(r.data);
        if (r.data.courseName && r.data.groupName) {
          try {
            await loadAssignments(r.data.courseName, r.data.groupName);
          } catch {
            toast.error('Failed to load assignments');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = () => {
    if (enrollment?.courseName && enrollment?.groupName) {
      loadAssignments(enrollment.courseName, enrollment.groupName);
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

  if (!enrollment) {
    return (
      <AppShell>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h2 style={{ fontWeight: 700 }}>Course not found</h2>
          <Link href="/student/courses" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to Courses
          </Link>
        </div>
      </AppShell>
    );
  }

  const color = COURSE_COLORS[enrollment.courseName] || '#6366f1';
  const filtered = assignments.filter(a => a.type.toLowerCase() === tab);

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Link href="/student/courses" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Courses
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <GraduationCap size={26} style={{ color }} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{enrollment.courseName}</h1>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                {enrollment.teacherName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} /> {enrollment.teacherName}
                  </span>
                )}
                {enrollment.groupName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {enrollment.groupName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Count badges */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ textAlign: 'center', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '8px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              {assignments.filter(a => a.type === 'HOMEWORK').length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Homeworks</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '8px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>
              {assignments.filter(a => a.type === 'QUIZ').length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quizzes</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button
          className={`tab-btn ${tab === 'homework' ? 'active' : ''}`}
          onClick={() => setTab('homework')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={15} /> Homework
          {assignments.filter(a => a.type === 'HOMEWORK').length > 0 && (
            <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 20, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
              {assignments.filter(a => a.type === 'HOMEWORK').length}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${tab === 'quiz' ? 'active' : ''}`}
          onClick={() => setTab('quiz')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ClipboardList size={15} /> Quiz
          {assignments.filter(a => a.type === 'QUIZ').length > 0 && (
            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 20, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
              {assignments.filter(a => a.type === 'QUIZ').length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{tab === 'homework' ? '📚' : '📝'}</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            No {tab === 'homework' ? 'homework' : 'quizzes'} yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Your teacher hasn't posted any {tab === 'homework' ? 'homework' : 'quizzes'} for this course yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(a => (
            <AssignmentCard key={a.id} assignment={a} courseId={id} onRefresh={refresh} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
