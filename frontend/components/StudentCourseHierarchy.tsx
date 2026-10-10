'use client';

import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, Play, Video, FileText, Download, ExternalLink, Lock } from 'lucide-react';
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

type Chapter = { name: string; lessons: Lesson[] };

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
    const chapter = chapterName?.trim() || 'General content';
    const lesson = lessonName?.trim() || 'Unassigned lesson';
    if (!chapters.has(chapter)) chapters.set(chapter, new Map());
    const lessons = chapters.get(chapter)!;
    if (!lessons.has(lesson)) lessons.set(lesson, []);
    lessons.get(lesson)!.push(item);
  };

  videos.forEach(video => add(video.chapterName, video.lessonName, { kind: 'video', value: video }));
  assignments.forEach(assignment => add(assignment.chapterName, assignment.lessonName, { kind: 'assignment', value: assignment }));

  if (chapters.size === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}>
        <BookOpen size={42} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <h3 style={{ marginBottom: 8 }}>No course content yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your teacher has not posted any lessons for this course yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from(chapters.entries()).map(([chapterName, lessonMap], chapterIndex) => (
        <ChapterSection key={chapterName} name={chapterName} defaultOpen={chapterIndex === 0}>
          {Array.from(lessonMap.entries()).map(([lessonName, items]) => (
            <LessonSection key={lessonName} name={lessonName} items={items} enrollmentId={enrollmentId} renderAssignment={renderAssignment} />
          ))}
        </ChapterSection>
      ))}
    </div>
  );
}

function ChapterSection({ name, defaultOpen, children }: { name: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setOpen(value => !value)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', color: 'inherit', textAlign: 'start' }}>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <BookOpen size={18} style={{ color: 'var(--primary-light)' }} />
        <span style={{ fontWeight: 800, fontSize: 17 }}>{name}</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 16px' }}>{children}</div>}
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

function LessonSection({ name, items, enrollmentId, renderAssignment }: { name: string; items: Lesson['items']; enrollmentId: string; renderAssignment: (assignment: Assignment) => React.ReactNode }) {
  const sorted = [...items].sort((a, b) => {
    const orderA = a.value.contentOrder ?? 0;
    const orderB = b.value.contentOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = (a.value as any).createdAt ? new Date((a.value as any).createdAt).getTime() : 0;
    const timeB = (b.value as any).createdAt ? new Date((b.value as any).createdAt).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'rgba(255,255,255,.025)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, margin: '0 0 10px' }}>
        <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} /> {name}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(item => item.kind === 'video' ? (
          <VideoRow key={`video-${item.value.id}`} video={item.value} enrollmentId={enrollmentId} />
        ) : (
          <div key={`assignment-${item.value.id}`}>{renderAssignment(item.value)}</div>
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10,
      background: video.isLocked
        ? 'rgba(239,68,68,0.04)'
        : isDoc
        ? 'rgba(14,165,233,0.05)'
        : 'rgba(99,102,241,0.06)',
      border: `1px solid ${
        video.isLocked
          ? 'rgba(239,68,68,0.2)'
          : isDoc
          ? 'rgba(14,165,233,0.2)'
          : 'rgba(99,102,241,0.15)'
      }`,
      color: 'inherit', opacity: video.isLocked ? 0.8 : 1, transition: 'all 0.15s ease',
    }}>
      <div style={{
        width: 56, height: 38, borderRadius: 8, flexShrink: 0,
        background: thumbnail
          ? `url(${thumbnail}) center / cover`
          : isDoc
          ? 'linear-gradient(135deg,#0369a1,#0f172a)'
          : 'linear-gradient(135deg,#312e81,#111827)',
        display: 'grid', placeItems: 'center',
        color: video.isLocked ? '#ef4444' : isDoc ? '#38bdf8' : '#fff',
      }}>
        {video.isLocked ? (
          <Lock size={16} style={{ color: '#ef4444' }} />
        ) : isDoc ? (
          <FileText size={18} style={{ color: '#38bdf8' }} />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14, color: video.isLocked ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
            {video.title}
          </strong>
          {isDoc && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(14,165,233,0.12)', color: '#38bdf8' }}>
              ملف / ملزمة (PDF)
            </span>
          )}
        </div>
        {video.description && (
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.description}
          </p>
        )}
        {video.isLocked && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 11, fontWeight: 600 }}>
            <Lock size={11} />
            <span>مغلق:</span>
            <span>{video.lockReason || 'أكمل المتطلبات السابقة لفتح هذا المحتوى'}</span>
          </div>
        )}
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
                  background: isDoc ? 'rgba(14,165,233,0.1)' : 'rgba(239,68,68,0.08)',
                  color: isDoc ? '#38bdf8' : '#f87171',
                  border: `1px solid ${isDoc ? 'rgba(14,165,233,0.25)' : 'rgba(239,68,68,0.2)'}`,
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
    </div>
  );

  if (video.isLocked) return content;

  // If document and has single attachment, click opens the attachment directly
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
