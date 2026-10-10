'use client';

import Link from 'next/link';
import {
  BookOpen, ChevronDown, ChevronRight, Play, FileText,
  Download, ExternalLink, Lock, CheckCircle2, Layers, Clock
} from 'lucide-react';
import { useState } from 'react';
import type React from 'react';

type Assignment = {
  id: string;
  type: 'HOMEWORK' | 'QUIZ';
  title: string;
  description?: string;
  maxGrade: number;
  submission: {
    id: string;
    content: string;
    attachments: string[];
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
  } | null;
  chapterName?: string | null;
  lessonName?: string | null;
  contentOrder?: number;
  attachments?: string[];
  createdAt?: string;
  isLocked?: boolean;
  lockReason?: string | null;
};

type VideoItem = {
  id: string;
  title: string;
  description?: string | null;
  chapterName?: string | null;
  lessonName?: string | null;
  contentOrder?: number;
  attachments?: string[];
  createdAt?: string;
  isLocked?: boolean;
  lockReason?: string | null;
  provider?: string;
  providerVideoId?: string | null;
  youtubeVideoId?: string | null;
};

type Lesson = {
  name: string;
  items: Array<{ kind: 'video'; value: VideoItem } | { kind: 'assignment'; value: Assignment }>;
};

export default function StudentCourseHierarchy({
  enrollmentId,
  assignments,
  videos,
  renderAssignment,
}: {
  enrollmentId: string;
  assignments: Assignment[];
  videos: VideoItem[];
  renderAssignment: (assignment: Assignment) => React.ReactNode;
}) {
  const chapters = new Map<string, Map<string, Lesson['items']>>();
  const add = (chapterName: string | null | undefined, lessonName: string | null | undefined, item: Lesson['items'][number]) => {
    const chapter = chapterName?.trim() || 'المحتوى العام (General Content)';
    const lesson = lessonName?.trim() || 'الدرس الأول (Lesson 1)';
    if (!chapters.has(chapter)) chapters.set(chapter, new Map());
    const lessons = chapters.get(chapter)!;
    if (!lessons.has(lesson)) lessons.set(lesson, []);
    lessons.get(lesson)!.push(item);
  };

  videos.forEach(video => add(video.chapterName, video.lessonName, { kind: 'video', value: video }));
  assignments.forEach(assignment => add(assignment.chapterName, assignment.lessonName, { kind: 'assignment', value: assignment }));

  if (chapters.size === 0) {
    return (
      <div className="card" style={{
        textAlign: 'center', padding: '64px 24px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
        borderRadius: 18,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'grid', placeItems: 'center', margin: '0 auto 16px',
          color: 'var(--primary-light)',
        }}>
          <BookOpen size={26} />
        </div>
        <h3 style={{ marginBottom: 6, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          لا يوجد محتوى متاح حالياً
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
          لم يقم المدرس برفع أي دروس أو حصص لهذه المادة بعد.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from(chapters.entries()).map(([chapterName, lessonMap], chapterIndex) => (
        <ChapterSection
          key={chapterName}
          name={chapterName}
          chapterIndex={chapterIndex}
          defaultOpen={chapterIndex === 0}
          lessonCount={lessonMap.size}
          itemCount={Array.from(lessonMap.values()).reduce((acc, curr) => acc + curr.length, 0)}
        >
          {Array.from(lessonMap.entries()).map(([lessonName, items]) => (
            <LessonSection
              key={lessonName}
              name={lessonName}
              items={items}
              enrollmentId={enrollmentId}
              renderAssignment={renderAssignment}
            />
          ))}
        </ChapterSection>
      ))}
    </div>
  );
}

function ChapterSection({
  name,
  chapterIndex,
  defaultOpen,
  lessonCount,
  itemCount,
  children,
}: {
  name: string;
  chapterIndex: number;
  defaultOpen: boolean;
  lessonCount: number;
  itemCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card" style={{
      padding: 0,
      overflow: 'hidden',
      borderRadius: 16,
      border: open ? '1px solid rgba(99,102,241,0.28)' : '1px solid var(--border)',
      background: 'linear-gradient(180deg, rgba(26,26,30,0.9) 0%, rgba(18,18,22,0.95) 100%)',
      transition: 'border-color 0.2s ease',
    }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '18px 22px',
          color: 'inherit',
          textAlign: 'start',
          background: open ? 'rgba(99,102,241,0.06)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: open ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>
            {String(chapterIndex + 1).padStart(2, '0')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {name}
            </h3>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              <span>{lessonCount} {lessonCount === 1 ? 'درس' : 'دروس'}</span>
              <span>•</span>
              <span>{itemCount} {itemCount === 1 ? 'عنصر تدريبي' : 'عناصر تدريبية'}</span>
            </div>
          </div>
        </div>

        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          display: 'grid', placeItems: 'center', color: 'var(--text-secondary)',
          flexShrink: 0,
        }}>
          {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        </div>
      </button>

      {open && (
        <div style={{
          padding: '16px 20px 22px',
          display: 'flex', flexDirection: 'column', gap: 14,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {children}
        </div>
      )}
    </section>
  );
}

function formatAttachmentLabel(url: string, index: number) {
  if (url.includes('drive.google.com')) return `ملزمة الدرس (Google Drive ${index > 0 ? index + 1 : ''})`;
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const name = decodeURIComponent(url.split('/').pop() || 'ملف PDF');
    return `ملف PDF: ${name}`;
  }
  return `ملف مرفق ${index + 1}`;
}

function LessonSection({
  name,
  items,
  enrollmentId,
  renderAssignment,
}: {
  name: string;
  items: Lesson['items'];
  enrollmentId: string;
  renderAssignment: (assignment: Assignment) => React.ReactNode;
}) {
  const sorted = [...items].sort((a, b) => {
    const orderA = a.value.contentOrder ?? 0;
    const orderB = b.value.contentOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = (a.value as any).createdAt ? new Date((a.value as any).createdAt).getTime() : 0;
    const timeB = (b.value as any).createdAt ? new Date((b.value as any).createdAt).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: '16px 18px',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-light)' }} />
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>
          {name}
        </h4>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {sorted.length} {sorted.length === 1 ? 'مهمة' : 'مهام'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(item => item.kind === 'video' ? (
          <VideoRow key={`video-${item.value.id}`} video={item.value} enrollmentId={enrollmentId} />
        ) : (
          <div key={`assignment-${item.value.id}`}>
            {renderAssignment(item.value)}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoRow({ video, enrollmentId }: { video: VideoItem; enrollmentId: string }) {
  const isDoc = video.provider === 'document';
  const provider = video.provider || 'youtube';
  const thumbnail = !isDoc && provider === 'youtube' && (video.providerVideoId || video.youtubeVideoId)
    ? `https://i.ytimg.com/vi/${video.providerVideoId || video.youtubeVideoId}/mqdefault.jpg`
    : undefined;

  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        borderRadius: 12,
        background: video.isLocked
          ? 'rgba(239,68,68,0.03)'
          : isDoc
          ? 'rgba(14,165,233,0.04)'
          : 'rgba(99,102,241,0.04)',
        border: `1px solid ${
          video.isLocked
            ? 'rgba(239,68,68,0.18)'
            : isDoc
            ? 'rgba(14,165,233,0.18)'
            : 'rgba(99,102,241,0.15)'
        }`,
        color: 'inherit',
        opacity: video.isLocked ? 0.75 : 1,
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={e => {
        if (!video.isLocked) {
          const target = e.currentTarget as HTMLElement;
          target.style.transform = 'translateY(-1px)';
          target.style.background = isDoc ? 'rgba(14,165,233,0.08)' : 'rgba(99,102,241,0.08)';
          target.style.borderColor = isDoc ? 'rgba(14,165,233,0.35)' : 'rgba(99,102,241,0.3)';
        }
      }}
      onMouseLeave={e => {
        const target = e.currentTarget as HTMLElement;
        target.style.transform = 'none';
        target.style.background = video.isLocked
          ? 'rgba(239,68,68,0.03)'
          : isDoc
          ? 'rgba(14,165,233,0.04)'
          : 'rgba(99,102,241,0.04)';
        target.style.borderColor = video.isLocked
          ? 'rgba(239,68,68,0.18)'
          : isDoc
          ? 'rgba(14,165,233,0.18)'
          : 'rgba(99,102,241,0.15)';
      }}
    >
      {/* Icon / Thumbnail Box */}
      <div style={{
        width: 50, height: 40, borderRadius: 10, flexShrink: 0,
        background: thumbnail
          ? `url(${thumbnail}) center / cover`
          : isDoc
          ? 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(15,23,42,0.9))'
          : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(15,23,42,0.9))',
        border: `1px solid ${isDoc ? 'rgba(14,165,233,0.3)' : 'rgba(99,102,241,0.3)'}`,
        display: 'grid', placeItems: 'center',
        color: video.isLocked ? '#ef4444' : isDoc ? '#38bdf8' : '#818cf8',
      }}>
        {video.isLocked ? (
          <Lock size={16} style={{ color: '#ef4444' }} />
        ) : isDoc ? (
          <FileText size={18} style={{ color: '#38bdf8' }} />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </div>

      {/* Title & Metadata */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{
            fontSize: 14, fontWeight: 700,
            color: video.isLocked ? 'var(--text-secondary)' : 'var(--text-primary)',
          }}>
            {video.title}
          </strong>
          {isDoc ? (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(14,165,233,0.12)', color: '#38bdf8' }}>
              ملف / ملزمة (PDF)
            </span>
          ) : (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)' }}>
              حصة دراسية
            </span>
          )}
        </div>

        {video.description && (
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.description}
          </p>
        )}

        {/* Lock warning */}
        {video.isLocked && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 11, fontWeight: 600 }}>
            <Lock size={11} />
            <span>مغلق: {video.lockReason || 'أكمل المتطلبات السابقة لفتح هذا المحتوى'}</span>
          </div>
        )}

        {/* Attachments pills */}
        {video.attachments && video.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {video.attachments.map((url, i) => (
              <a
                key={i}
                href={video.isLocked ? undefined : url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => {
                  e.stopPropagation();
                  if (video.isLocked) {
                    e.preventDefault();
                    alert(video.lockReason || 'هذا المحتوى مغلق حتى إكمال المتطلبات السابقة');
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: isDoc ? 'rgba(14,165,233,0.1)' : 'rgba(99,102,241,0.08)',
                  color: isDoc ? '#38bdf8' : 'var(--primary-light)',
                  border: `1px solid ${isDoc ? 'rgba(14,165,233,0.25)' : 'rgba(99,102,241,0.2)'}`,
                  textDecoration: 'none',
                  cursor: video.isLocked ? 'not-allowed' : 'pointer',
                  opacity: video.isLocked ? 0.6 : 1,
                }}
              >
                <FileText size={12} />
                <span>{formatAttachmentLabel(url, i)}</span>
                <Download size={11} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Action button */}
      {!video.isLocked && (
        <div style={{ flexShrink: 0, paddingLeft: 6 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            background: isDoc ? 'rgba(14,165,233,0.12)' : 'rgba(99,102,241,0.12)',
            color: isDoc ? '#38bdf8' : 'var(--primary-light)',
            border: `1px solid ${isDoc ? 'rgba(14,165,233,0.25)' : 'rgba(99,102,241,0.25)'}`,
          }}>
            {isDoc ? 'عرض الملزمة' : 'مشاهدة الحصة'}
            <ChevronRight size={13} />
          </span>
        </div>
      )}
    </div>
  );

  if (video.isLocked) return content;

  if (isDoc && video.attachments && video.attachments.length === 1) {
    return (
      <a href={video.attachments[0]} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </a>
    );
  }

  return (
    <Link href={`/student/courses/${encodeURIComponent(enrollmentId)}/videos/${encodeURIComponent(video.id)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  );
}
