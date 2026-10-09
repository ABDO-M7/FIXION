'use client';

import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, Play, Video } from 'lucide-react';
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

function LessonSection({ name, items, enrollmentId, renderAssignment }: { name: string; items: Lesson['items']; enrollmentId: string; renderAssignment: (assignment: Assignment) => React.ReactNode }) {
  const sorted = [...items].sort((a, b) => (a.value.contentOrder || 0) - (b.value.contentOrder || 0));
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
  const provider = video.provider || 'youtube';
  const thumbnail = provider === 'youtube' && (video.providerVideoId || video.youtubeVideoId)
    ? `https://i.ytimg.com/vi/${video.providerVideoId || video.youtubeVideoId}/mqdefault.jpg`
    : undefined;
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, background: video.isLocked ? 'rgba(148,163,184,.08)' : 'rgba(99,102,241,.08)', color: 'inherit', opacity: video.isLocked ? 0.72 : 1 }}>
      <div style={{ width: 64, height: 40, borderRadius: 7, flexShrink: 0, background: thumbnail ? `url(${thumbnail}) center / cover` : 'linear-gradient(135deg,#312e81,#111827)', display: 'grid', placeItems: 'center' }}>
        <Play size={15} fill="currentColor" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14 }}><Video size={14} style={{ color: '#818cf8' }} /> {video.title}</div>
        {video.description && <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.description}</p>}
        {video.isLocked && <p style={{ margin: '3px 0 0', color: '#f59e0b', fontSize: 12 }}>{video.lockReason}</p>}
      </div>
    </div>
  );
  return video.isLocked ? content : <Link href={`/student/courses/${encodeURIComponent(enrollmentId)}/videos/${encodeURIComponent(video.id)}`} style={{ color: 'inherit' }}>{content}</Link>;
}
