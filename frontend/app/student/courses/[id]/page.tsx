'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { enrollmentsApi, assignmentsApi, uploadsApi, videosApi } from '@/lib/api';
import StudentCourseHierarchy from '@/components/StudentCourseHierarchy';
import {
  GraduationCap, User, ArrowLeft, BookOpen, HelpCircle, Calendar,
  ClipboardList, Upload, X, FileText, Image, CheckCircle2,
  Clock, Loader2, ExternalLink, Star, BarChart2, TrendingUp,
  Lock, Search, Award, ChevronRight, AlertCircle, Check
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COURSE_COLOR_MAP: Record<string, { accent: string; bg: string; border: string }> = {
  'فيزيا': { accent: '#818cf8', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.25)' },
  'رياضه': { accent: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' },
  'احصاء': { accent: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' },
  'عربي':  { accent: '#f87171', bg: 'rgba(239, 68, 68, 0.12)',  border: 'rgba(239, 68, 68, 0.25)' },
  'برمجه': { accent: '#c084fc', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.25)' },
};

function getCourseTheme(name: string = '') {
  for (const [key, val] of Object.entries(COURSE_COLOR_MAP)) {
    if (name.includes(key)) return val;
  }
  return { accent: '#818cf8', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.25)' };
}

function formatSafeDate(d?: string | null, fmt = 'dd MMM yyyy') {
  if (!d) return null;
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return null;
    return format(parsed, fmt);
  } catch {
    return null;
  }
}

type Assignment = {
  id: string;
  type: 'HOMEWORK' | 'QUIZ';
  title: string;
  description?: string;
  dueDate?: string;
  createdAt?: string;
  maxGrade: number;
  attachments?: string[];
  submission: {
    id: string;
    content: string;
    attachments: string[];
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
  } | null;
  isLocked?: boolean;
  lockReason?: string | null;
};

// ── File icon helper ────────────────────────────────────────────────────────
function FileIcon({ url }: { url: string }) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText size={14} style={{ color: '#ef4444' }} />;
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return <FileText size={14} style={{ color: '#38bdf8' }} />;
  return <Image size={14} style={{ color: '#34d399' }} />;
}

function fileName(url: string) {
  try {
    const parts = new URL(url).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url.split('/').pop() || 'file';
  }
}

// ── Submit Modal ────────────────────────────────────────────────────────────
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const valid: File[] = [];
    Array.from(selected).forEach(f => {
      if (!allowed.includes(f.type)) { toast.error(`${f.name}: unsupported file type`); return; }
      if (f.size > 15 * 1024 * 1024) { toast.error(`${f.name}: must be under 15MB`); return; }
      valid.push(f);
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const submit = async () => {
    if (!content.trim() && files.length === 0 && existingUrls.length === 0) {
      toast.error('Please add your answer note or attach your files');
      return;
    }

    setSaving(true);
    let uploadedUrls: string[] = [...existingUrls];
    const failedUploads: string[] = [];

    if (files.length > 0) {
      setUploading(true);
      for (const file of files) {
        try {
          const res = await uploadsApi.upload(file);
          uploadedUrls.push(res.data.url);
        } catch (err: any) {
          const msg = err?.response?.data?.message || `Failed to upload ${file.name}`;
          failedUploads.push(file.name);
          toast.error(msg);
        }
      }
      setUploading(false);
    }

    if (failedUploads.length > 0 && uploadedUrls.length === 0 && !content.trim()) {
      setSaving(false);
      return;
    }

    try {
      await assignmentsApi.submit(assignment.id, {
        content: content.trim(),
        attachments: uploadedUrls,
      });

      if (failedUploads.length > 0) {
        toast.success('Submitted, but some files could not be uploaded.');
      } else {
        toast.success('Assignment submitted successfully!');
      }
      onSubmitted();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Submission failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isUpdate = !!assignment.submission;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 15, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          background: 'linear-gradient(180deg, rgba(22, 27, 44, 0.95) 0%, rgba(13, 17, 30, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
          padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: assignment.type === 'QUIZ' ? '#818cf8' : '#fbbf24',
                background: assignment.type === 'QUIZ' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                padding: '3px 8px',
                borderRadius: 6,
              }}>
                {assignment.type === 'QUIZ' ? 'Quiz Submission' : 'Homework Task'}
              </span>
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: '#f8fafc', margin: 0 }}>
              {isUpdate ? 'Update Submission' : 'Submit Assignment'}
            </h3>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{assignment.title}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Note Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
            Answer Note or Comments
          </label>
          <textarea
            className="form-input form-textarea"
            placeholder="Type your explanation, answers, or notes for the instructor…"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{
              minHeight: 110,
              background: 'rgba(10, 14, 26, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              color: '#f8fafc',
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragOver ? '2px dashed #818cf8' : '2px dashed rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: dragOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          }}
          onMouseEnter={e => { if (!dragOver) e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.5)'; }}
          onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Upload size={22} style={{ color: '#818cf8' }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', margin: '0 0 4px' }}>
            Choose files or drag and drop
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            PDF, Word, JPG, PNG, GIF — up to 15MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Existing attachments */}
        {existingUrls.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attached previously ({existingUrls.length})
            </div>
            {existingUrls.map((url, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <FileIcon url={url} />
                <span style={{ flex: 1, fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName(url)}
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#94a3b8',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => setExistingUrls(prev => prev.filter((_, j) => j !== i))}
                  style={{
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    borderRadius: 6,
                    padding: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New queued files */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ready to upload ({files.length})
            </div>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(99, 102, 241, 0.06)',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <FileIcon url={f.name} />
                <span style={{ flex: 1, fontSize: 12, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  style={{
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    borderRadius: 6,
                    padding: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            style={{ borderRadius: 10, padding: '9px 18px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
            style={{ borderRadius: 10, padding: '9px 22px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {saving ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{uploading ? 'Uploading Files…' : 'Submitting…'}</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>{isUpdate ? 'Update Submission' : 'Confirm Submission'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assignment Card ────────────────────────────────────────────────────────
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
  const hasGrade = sub?.grade !== null && sub?.grade !== undefined;

  return (
    <>
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'linear-gradient(180deg, rgba(19, 24, 38, 0.8) 0%, rgba(13, 17, 28, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderLeft: hasGrade
            ? '3px solid #10b981'
            : sub
            ? '3px solid #818cf8'
            : assignment.isLocked
            ? '3px solid rgba(239, 68, 68, 0.5)'
            : '3px solid rgba(245, 158, 11, 0.6)',
          borderRadius: 14,
          padding: 18,
          transition: 'all 0.2s ease',
        }}
      >
        {/* Top header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
            {/* Type Icon Badge */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                flexShrink: 0,
                background: isHw ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                border: isHw ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isHw ? <BookOpen size={20} style={{ color: '#fbbf24' }} /> : <ClipboardList size={20} style={{ color: '#818cf8' }} />}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 7px',
                    borderRadius: 5,
                    background: isHw ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    color: isHw ? '#fbbf24' : '#818cf8',
                  }}
                >
                  {isHw ? 'Homework' : 'Quiz'}
                </span>

                {assignment.dueDate && (
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    <span>Due: {formatSafeDate(assignment.dueDate) || assignment.dueDate}</span>
                  </span>
                )}
              </div>

              <h4 style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc', margin: '0 0 4px', lineHeight: 1.4 }}>
                {assignment.title}
              </h4>

              {assignment.description && (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  {assignment.description}
                </p>
              )}

              {/* Attached files by teacher */}
              {assignment.attachments && assignment.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {assignment.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={assignment.isLocked ? undefined : url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => {
                        if (assignment.isLocked) {
                          e.preventDefault();
                          toast.error(assignment.lockReason || 'This task is locked until prior lessons are completed');
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.09)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#cbd5e1',
                        textDecoration: 'none',
                        cursor: assignment.isLocked ? 'not-allowed' : 'pointer',
                        opacity: assignment.isLocked ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <FileIcon url={url} />
                      <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {url.includes('drive.google.com') ? `Resource Drive (${i + 1})` : fileName(url)}
                      </span>
                      <ExternalLink size={11} style={{ opacity: 0.6 }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Status / Grade Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {assignment.isLocked ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                }}
              >
                <Lock size={12} />
                <span>Locked</span>
              </span>
            ) : hasGrade ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 20,
                  padding: '5px 12px',
                }}
              >
                <Star size={13} style={{ color: '#34d399' }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>
                  {sub.grade} / {maxGrade}
                </span>
              </div>
            ) : sub ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: '#818cf8',
                }}
              >
                <CheckCircle2 size={12} />
                <span>Submitted</span>
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#fbbf24',
                }}
              >
                <Clock size={12} />
                <span>Pending</span>
              </span>
            )}
          </div>
        </div>

        {/* Existing student submission details */}
        {sub && (
          <div
            style={{
              background: 'rgba(10, 14, 26, 0.6)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Submission Details
              </span>
              {sub.submittedAt && (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Submitted on {formatSafeDate(sub.submittedAt, 'dd MMM yyyy - hh:mm a')}
                </span>
              )}
            </div>

            {sub.content && assignment.type !== 'QUIZ' && (
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                {sub.content}
              </p>
            )}

            {sub.content && assignment.type === 'QUIZ' && (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                Answers recorded and submitted to the evaluation system.
              </p>
            )}

            {sub.attachments && sub.attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sub.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      color: '#a5b4fc',
                      textDecoration: 'none',
                    }}
                  >
                    <FileIcon url={url} />
                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileName(url)}
                    </span>
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            )}

            {sub.feedback && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#e2e8f0',
                  borderLeft: '3px solid #818cf8',
                }}
              >
                <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: 2, fontSize: 12 }}>
                  Instructor Feedback:
                </div>
                {sub.feedback}
              </div>
            )}
          </div>
        )}

        {/* Lock alert notice */}
        {assignment.isLocked && (
          <div
            style={{
              color: '#f87171',
              fontSize: 12,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
            }}
          >
            <Lock size={14} style={{ flexShrink: 0 }} />
            <span>{assignment.lockReason || 'Complete previous requirements to unlock this assignment'}</span>
          </div>
        )}

        {/* Bottom Action Button */}
        {!assignment.isLocked && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            {assignment.type === 'QUIZ' ? (
              <Link
                href={`/student/courses/${courseId}/quiz/${assignment.id}`}
                className={`btn ${sub ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                style={{ borderRadius: 8, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ClipboardList size={14} />
                <span>{sub ? 'View Quiz Results' : 'Take Quiz'}</span>
              </Link>
            ) : (
              <button
                type="button"
                className={`btn ${sub ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                onClick={() => setShowModal(true)}
                style={{ borderRadius: 8, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Upload size={14} />
                <span>{sub ? 'Update Submission' : 'Submit Homework'}</span>
              </button>
            )}
          </div>
        )}
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

// ── Grades & Progress Tab ──────────────────────────────────────────────────
function GradesTab({ assignments }: { assignments: Assignment[] }) {
  const homeworks = assignments.filter(a => a.type === 'HOMEWORK');
  const quizzes   = assignments.filter(a => a.type === 'QUIZ');

  const sumGrade = (list: Assignment[]) => list.reduce((acc, a) => acc + (a.submission?.grade ?? 0), 0);
  const sumMax   = (list: Assignment[]) => list.reduce((acc, a) => acc + a.maxGrade, 0);
  const scored   = (list: Assignment[]) => list.filter(a => a.submission?.grade !== null && a.submission?.grade !== undefined);

  const hwEarned    = sumGrade(scored(homeworks));
  const hwMax       = sumMax(homeworks);
  const qzEarned    = sumGrade(scored(quizzes));
  const qzMax       = sumMax(quizzes);
  const totalEarned = hwEarned + qzEarned;
  const totalMax    = hwMax + qzMax;

  const pct = (earned: number, max: number) => max > 0 ? Math.round((earned / max) * 100) : 0;
  const pctColor = (p: number) => p >= 85 ? '#34d399' : p >= 60 ? '#fbbf24' : '#f87171';

  // Group by month
  const byMonth: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    const d = a.createdAt || a.dueDate;
    const label = d ? (formatSafeDate(d, 'MMMM yyyy') || 'Unscheduled') : 'Unscheduled';
    if (!byMonth[label]) byMonth[label] = [];
    byMonth[label].push(a);
  }

  const SummaryCard = ({
    title,
    earned,
    max,
    count,
    icon,
    color,
    bg,
    border,
  }: {
    title: string;
    earned: number;
    max: number;
    count: number;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
  }) => {
    const p = pct(earned, max);
    return (
      <div
        className="card"
        style={{
          flex: 1,
          minWidth: 220,
          background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.7) 0%, rgba(13, 17, 28, 0.8) 100%)',
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
            }}>
              {icon}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{title}</span>
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{count} items</span>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color }}>{earned}</span>
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>/ {max} pts</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
            <span style={{ color: '#94a3b8' }}>Completion Score</span>
            <span style={{ color }}>{p}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                width: `${p}%`,
                background: color,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Analytics Bento Summary */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <SummaryCard
          title="Homework Score"
          earned={hwEarned}
          max={hwMax}
          count={homeworks.length}
          icon={<BookOpen size={17} />}
          color="#fbbf24"
          bg="rgba(245, 158, 11, 0.12)"
          border="rgba(245, 158, 11, 0.25)"
        />
        <SummaryCard
          title="Quizzes Score"
          earned={qzEarned}
          max={qzMax}
          count={quizzes.length}
          icon={<ClipboardList size={17} />}
          color="#818cf8"
          bg="rgba(99, 102, 241, 0.12)"
          border="rgba(99, 102, 241, 0.25)"
        />
        <SummaryCard
          title="Total Overall Score"
          earned={totalEarned}
          max={totalMax}
          count={assignments.length}
          icon={<Award size={17} />}
          color="#34d399"
          bg="rgba(16, 185, 129, 0.12)"
          border="rgba(16, 185, 129, 0.25)"
        />
      </div>

      {/* Full Assignments Table */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(18, 23, 38, 0.7) 0%, rgba(13, 17, 28, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={18} style={{ color: '#818cf8' }} />
          <h3 style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc', margin: 0 }}>
            Task Ledger & Grade History
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assignment</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 18px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    No assignments or quizzes registered yet
                  </td>
                </tr>
              ) : (
                assignments.map(a => {
                  const g = a.submission?.grade;
                  const hasGrade = g !== null && g !== undefined;
                  const p = hasGrade ? pct(g!, a.maxGrade) : null;
                  const d = a.createdAt || a.dueDate;
                  return (
                    <tr
                      key={a.id}
                      style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                        {a.title}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: a.type === 'QUIZ' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: a.type === 'QUIZ' ? '#818cf8' : '#fbbf24',
                            border: a.type === 'QUIZ' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                          }}
                        >
                          {a.type === 'QUIZ' ? 'Quiz' : 'Homework'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                        {d ? formatSafeDate(d, 'MMM yyyy') : '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {hasGrade ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: pctColor(p!) }}>
                              {g} / {a.maxGrade}
                            </span>
                            <span style={{ fontSize: 11, color: pctColor(p!), fontWeight: 700 }}>
                              ({p}%)
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {!a.submission ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: 6 }}>
                            <Clock size={11} /> Not Submitted
                          </span>
                        ) : hasGrade ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: 6 }}>
                            <CheckCircle2 size={11} /> Graded
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '3px 8px', borderRadius: 6 }}>
                            <Clock size={11} /> Under Review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Breakdown Accordions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TrendingUp size={18} style={{ color: '#818cf8' }} />
          <h3 style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc', margin: 0 }}>
            Monthly Progress Breakdown
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(byMonth).map(([month, list]) => {
            const mScored = scored(list);
            const mEarned = sumGrade(mScored);
            const mMax    = sumMax(list);
            const mPct    = pct(mEarned, mMax);
            return (
              <div
                key={month}
                className="card"
                style={{
                  padding: '18px 20px',
                  background: 'linear-gradient(180deg, rgba(18, 23, 38, 0.6) 0%, rgba(13, 17, 28, 0.7) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>{month}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {list.length} task{list.length !== 1 ? 's' : ''} • {mScored.length} graded
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: pctColor(mPct) }}>
                      {mEarned} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/ {mMax}</span>
                    </div>
                    <div style={{ fontSize: 12, color: pctColor(mPct), fontWeight: 700 }}>{mPct}% score</div>
                  </div>
                </div>

                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 99,
                      width: `${mPct}%`,
                      background: pctColor(mPct),
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>

                {/* Task items list */}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.map(a => {
                    const g = a.submission?.grade;
                    const hasG = g !== null && g !== undefined;
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.02)',
                        }}
                      >
                        <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{a.title}</span>
                        <span style={{ fontWeight: 700, color: hasG ? pctColor(pct(g!, a.maxGrade)) : '#64748b' }}>
                          {hasG ? `${g} / ${a.maxGrade}` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'GRADES'>('CONTENT');

  const loadAssignments = useCallback(async (courseName: string, groupName: string) => {
    const [assignmentsRes, videosRes] = await Promise.all([
      assignmentsApi.myAssignments(courseName, groupName),
      videosApi.studentList(courseName, groupName),
    ]);
    setAssignments(assignmentsRes.data);
    setVideos(videosRes.data);
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
  }, [id, loadAssignments]);

  const refresh = () => {
    if (enrollment?.courseName && enrollment?.groupName) {
      loadAssignments(enrollment.courseName, enrollment.groupName);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px', gap: 14 }}>
          <Loader2 size={36} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Loading course syllabus & materials…</p>
        </div>
      </AppShell>
    );
  }

  if (!enrollment) {
    return (
      <AppShell>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            maxWidth: 480,
            margin: '60px auto',
            borderRadius: 20,
            background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.8) 0%, rgba(13, 17, 28, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Search size={28} style={{ color: '#f87171' }} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: '#f8fafc', marginBottom: 8 }}>
            Course Not Found
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
            You may not be enrolled in this course or the link might be incorrect.
          </p>
          <Link href="/student/courses" className="btn btn-primary" style={{ borderRadius: 10, padding: '9px 20px' }}>
            Back to All Courses
          </Link>
        </div>
      </AppShell>
    );
  }

  const theme = getCourseTheme(enrollment.courseName);
  const teacherPermissions = enrollment.teacherPermissions || { questions: true, appointments: true };

  const hwCount = assignments.filter(a => a.type === 'HOMEWORK').length;
  const qzCount = assignments.filter(a => a.type === 'QUIZ').length;
  const vidCount = videos.length;

  return (
    <AppShell>
      {/* Back Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/student/courses"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#94a3b8',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f8fafc';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to My Courses</span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div
        className="card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '28px',
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(24, 30, 48, 0.95) 0%, rgba(13, 17, 30, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          marginBottom: 24,
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: 40,
            width: 320,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.accent}25 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
          {/* Main Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flex: 1, minWidth: 280 }}>
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 18,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 8px 24px ${theme.border}`,
              }}
            >
              <GraduationCap size={32} style={{ color: theme.accent }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    padding: '3px 9px',
                    borderRadius: 6,
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    color: theme.accent,
                  }}
                >
                  Active Course
                </span>
                {enrollment.expiresAt && (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    Valid until {formatSafeDate(enrollment.expiresAt)}
                  </span>
                )}
              </div>

              <h1 style={{ fontWeight: 800, fontSize: 26, color: '#f8fafc', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {enrollment.courseName}
              </h1>

              {/* Badges / Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    padding: '4px 12px',
                    borderRadius: 8,
                    color: '#c7d2fe',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <User size={13} style={{ color: '#818cf8' }} />
                  <span>المدرس: {enrollment.teacher?.name || enrollment.teacherName || 'مدرس المادة'}</span>
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '4px 12px',
                    borderRadius: 8,
                    color: '#fde68a',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Calendar size={13} style={{ color: '#fbbf24' }} />
                  <span>المجموعة: {enrollment.groupName || 'المجموعة الأساسية'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bento Pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '10px 16px',
                minWidth: 84,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>{vidCount}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lessons</div>
            </div>

            <div
              style={{
                textAlign: 'center',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 12,
                padding: '10px 16px',
                minWidth: 84,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>{hwCount}</div>
              <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Homework</div>
            </div>

            <div
              style={{
                textAlign: 'center',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 12,
                padding: '10px 16px',
                minWidth: 84,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8' }}>{qzCount}</div>
              <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quizzes</div>
            </div>
          </div>
        </div>

        {/* Quick Instructor Actions */}
        {(teacherPermissions.questions || teacherPermissions.appointments) && (
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.06)', flexWrap: 'wrap' }}>
            {teacherPermissions.questions && (
              <Link
                href={`/student/questions/new?courseName=${encodeURIComponent(enrollment.courseName)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#cbd5e1';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <HelpCircle size={15} style={{ color: '#818cf8' }} />
                <span>Ask Instructor (طرح سؤال)</span>
              </Link>
            )}

            {teacherPermissions.appointments && (
              <Link
                href={`/student/appointments?courseName=${encodeURIComponent(enrollment.courseName)}&groupName=${encodeURIComponent(enrollment.groupName || '')}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  padding: '7px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#cbd5e1';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <Calendar size={15} style={{ color: '#fbbf24' }} />
                <span>Schedule Session (حجز موعد)</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Modern Segmented Floating Tabs */}
      <div
        style={{
          display: 'inline-flex',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: 4,
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('CONTENT')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'CONTENT' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            color: activeTab === 'CONTENT' ? '#f8fafc' : '#94a3b8',
            boxShadow: activeTab === 'CONTENT' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <BookOpen size={16} style={{ color: activeTab === 'CONTENT' ? '#818cf8' : '#64748b' }} />
          <span>Course Content (المحتوى التعليمي)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GRADES')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'GRADES' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            color: activeTab === 'GRADES' ? '#f8fafc' : '#94a3b8',
            boxShadow: activeTab === 'GRADES' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <BarChart2 size={16} style={{ color: activeTab === 'GRADES' ? '#818cf8' : '#64748b' }} />
          <span>Grades & Progress (درجاتي والإحصائيات)</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'CONTENT' ? (
        <StudentCourseHierarchy
          enrollmentId={id}
          assignments={assignments}
          videos={videos}
          renderAssignment={assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              courseId={id}
              onRefresh={refresh}
            />
          )}
        />
      ) : (
        <GradesTab assignments={assignments} />
      )}
    </AppShell>
  );
}
