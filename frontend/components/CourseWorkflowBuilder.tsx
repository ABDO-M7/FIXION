'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Video as VideoIcon, ClipboardList, Plus, Trash2, Edit3,
  ArrowUp, ArrowDown, ExternalLink, Sparkles, CheckCircle2,
  Lock, Unlock, Clock, FileText, ChevronDown, ChevronRight, X, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { assignmentsApi, videosApi } from '@/lib/api';

export type WorkflowItemKind = 'video' | 'assignment';

export type WorkflowVideo = {
  id: string;
  courseName: string;
  groupName: string;
  title: string;
  description?: string | null;
  chapterName?: string | null;
  lessonName?: string | null;
  contentOrder?: number;
  provider?: string;
  providerVideoId?: string | null;
  youtubeVideoId?: string | null;
  unlockRule?: string;
  unlockAssignmentId?: string | null;
  unlockScore?: number | null;
  unlockVideoId?: string | null;
  unlockPercent?: number | null;
  checkpoints?: any[];
};

export type WorkflowAssignment = {
  id: string;
  courseName: string;
  groupName: string;
  title: string;
  description?: string | null;
  type: 'QUIZ' | 'HOMEWORK';
  chapterName?: string | null;
  lessonName?: string | null;
  contentOrder?: number;
  dueDate?: string | null;
  maxGrade?: number;
  isPublished?: boolean;
  unlockRule?: string;
  unlockAssignmentId?: string | null;
  unlockScore?: number | null;
  unlockVideoId?: string | null;
  unlockPercent?: number | null;
};

export type UnifiedItem =
  | { kind: 'video'; item: WorkflowVideo }
  | { kind: 'assignment'; item: WorkflowAssignment };

interface CourseWorkflowBuilderProps {
  courseName: string;
  groupName: string;
  isAdmin?: boolean;
}

export default function CourseWorkflowBuilder({
  courseName,
  groupName,
  isAdmin = false,
}: CourseWorkflowBuilderProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<WorkflowVideo[]>([]);
  const [assignments, setAssignments] = useState<WorkflowAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [activeChapter, setActiveChapter] = useState('');
  const [activeLesson, setActiveLesson] = useState('');
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newLessonName, setNewLessonName] = useState('');

  // Edit item state
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null);

  // Collapsed chapters
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, aRes] = await Promise.all([
        videosApi.teacherList(courseName, groupName),
        assignmentsApi.list(courseName, groupName),
      ]);
      setVideos(Array.isArray(vRes.data) ? vRes.data : []);
      setAssignments(Array.isArray(aRes.data) ? aRes.data : []);
    } catch {
      toast.error('Failed to load course workflow');
    } finally {
      setLoading(false);
    }
  }, [courseName, groupName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group into Chapters -> Lessons -> Ordered items
  const hierarchy = useMemo(() => {
    const chaptersMap = new Map<string, Map<string, UnifiedItem[]>>();

    const add = (
      chapterName: string | null | undefined,
      lessonName: string | null | undefined,
      item: UnifiedItem
    ) => {
      const ch = chapterName?.trim() || 'General Chapter';
      const ls = lessonName?.trim() || 'Lesson 1';
      if (!chaptersMap.has(ch)) chaptersMap.set(ch, new Map());
      const lessonsMap = chaptersMap.get(ch)!;
      if (!lessonsMap.has(ls)) lessonsMap.set(ls, []);
      lessonsMap.get(ls)!.push(item);
    };

    videos.forEach(v => add(v.chapterName, v.lessonName, { kind: 'video', item: v }));
    assignments.forEach(a => add(a.chapterName, a.lessonName, { kind: 'assignment', item: a }));

    return chaptersMap;
  }, [videos, assignments]);

  // Handle reorder
  const moveItem = async (lessonItems: UnifiedItem[], index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessonItems.length) return;

    const current = lessonItems[index];
    const target = lessonItems[targetIndex];

    const currentOrder = current.item.contentOrder ?? index;
    const targetOrder = target.item.contentOrder ?? targetIndex;

    const newOrderForCurrent = targetOrder === currentOrder ? (direction === 'up' ? targetOrder - 1 : targetOrder + 1) : targetOrder;
    const newOrderForTarget = currentOrder;

    try {
      if (current.kind === 'video') {
        await videosApi.update(current.item.id, { contentOrder: newOrderForCurrent });
      } else {
        await assignmentsApi.update(current.item.id, { contentOrder: newOrderForCurrent });
      }

      if (target.kind === 'video') {
        await videosApi.update(target.item.id, { contentOrder: newOrderForTarget });
      } else {
        await assignmentsApi.update(target.item.id, { contentOrder: newOrderForTarget });
      }

      toast.success('Order updated');
      fetchData();
    } catch {
      toast.error('Failed to reorder items');
    }
  };

  const deleteItem = async (unified: UnifiedItem) => {
    if (!confirm(`Are you sure you want to delete "${unified.item.title}"?`)) return;
    try {
      if (unified.kind === 'video') {
        await videosApi.delete(unified.item.id);
      } else {
        await assignmentsApi.delete(unified.item.id);
      }
      toast.success('Item deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const openAddItem = (chapter: string, lesson: string) => {
    setActiveChapter(chapter);
    setActiveLesson(lesson);
    setShowAddItemModal(true);
  };

  const toggleChapter = (ch: string) => {
    setCollapsedChapters(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <span className="spinner" style={{ width: 34, height: 34, borderWidth: 3 }} />
      </div>
    );
  }

  const allAvailableVideos = videos;
  const allAvailableAssignments = assignments;

  return (
    <div>
      {/* Action Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: '16px 20px',
        background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)',
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} style={{ color: 'var(--primary)' }} />
            Course Workflow & Lessons
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Design your structured lesson flow: Videos, Quizzes, and Homework with prerequisite rules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Sparkles size={15} style={{ color: '#f59e0b' }} /> Apply Preset Template
          </button>
          <button
            onClick={() => {
              setNewChapterName('');
              setNewLessonName('Lesson 1');
              setShowNewChapterModal(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Add New Chapter
          </button>
        </div>
      </div>

      {/* Chapters & Lessons */}
      {hierarchy.size === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No content in this course yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 440, margin: '0 auto 20px' }}>
            Get started by applying an automated template (e.g. Physics or Languages) or create your first chapter manually.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => setShowTemplateModal(true)} className="btn btn-primary">
              <Sparkles size={16} /> Apply Preset Template
            </button>
            <button
              onClick={() => {
                setNewChapterName('Chapter 1');
                setNewLessonName('Lesson 1');
                setShowNewChapterModal(true);
              }}
              className="btn btn-secondary"
            >
              <Plus size={16} /> Create Chapter 1
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {Array.from(hierarchy.entries()).map(([chapterName, lessonMap]) => {
            const isCollapsed = collapsedChapters[chapterName];
            return (
              <div
                key={chapterName}
                className="card"
                style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}
              >
                {/* Chapter Header */}
                <div style={{
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div
                    onClick={() => toggleChapter(chapterName)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{chapterName}</h3>
                    <span className="badge" style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)' }}>
                      {lessonMap.size} {lessonMap.size === 1 ? 'Lesson' : 'Lessons'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const nextLessonNum = lessonMap.size + 1;
                      openAddItem(chapterName, `Lesson ${nextLessonNum}`);
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    <Plus size={13} /> Add Lesson to this Chapter
                  </button>
                </div>

                {/* Lessons in Chapter */}
                {!isCollapsed && (
                  <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Array.from(lessonMap.entries()).map(([lessonName, items]) => {
                      const sortedItems = [...items].sort(
                        (a, b) => (a.item.contentOrder ?? 0) - (b.item.contentOrder ?? 0)
                      );
                      return (
                        <div
                          key={lessonName}
                          style={{
                            background: 'var(--bg-elevated)',
                            borderRadius: 10,
                            padding: 16,
                            border: '1px solid var(--border)',
                          }}
                        >
                          {/* Lesson Bar */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                                📌 {lessonName}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                ({sortedItems.length} items)
                              </span>
                            </div>
                            <button
                              onClick={() => openAddItem(chapterName, lessonName)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12 }}
                            >
                              <Plus size={13} /> Add Item to {lessonName}
                            </button>
                          </div>

                          {/* Lesson Workflow Items */}
                          {sortedItems.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                              No items in this lesson yet. Click "Add Item" above to add a video, quiz, or homework.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {sortedItems.map((unified, idx) => (
                                <WorkflowItemRow
                                  key={`${unified.kind}-${unified.item.id}`}
                                  unified={unified}
                                  stepNumber={idx + 1}
                                  isFirst={idx === 0}
                                  isLast={idx === sortedItems.length - 1}
                                  onMoveUp={() => moveItem(sortedItems, idx, 'up')}
                                  onMoveDown={() => moveItem(sortedItems, idx, 'down')}
                                  onEdit={() => setEditingItem(unified)}
                                  onDelete={() => deleteItem(unified)}
                                  courseName={courseName}
                                  groupName={groupName}
                                  isAdmin={isAdmin}
                                  allVideos={allAvailableVideos}
                                  allAssignments={allAvailableAssignments}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Add Item to Lesson ── */}
      {showAddItemModal && (
        <AddItemModal
          chapterName={activeChapter}
          lessonName={activeLesson}
          courseName={courseName}
          groupName={groupName}
          allVideos={allAvailableVideos}
          allAssignments={allAvailableAssignments}
          onClose={() => setShowAddItemModal(false)}
          onCreated={() => {
            setShowAddItemModal(false);
            fetchData();
          }}
          router={router}
        />
      )}

      {/* ── Modal: Create New Chapter ── */}
      {showNewChapterModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create New Chapter & Lesson</h3>
              <button className="icon-btn" onClick={() => setShowNewChapterModal(false)}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Chapter Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Chapter 1: Newton's Laws"
                  value={newChapterName}
                  onChange={e => setNewChapterName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">First Lesson Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Lesson 1: Introduction"
                  value={newLessonName}
                  onChange={e => setNewLessonName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowNewChapterModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!newChapterName.trim()) { toast.error('Chapter name is required'); return; }
                    setShowNewChapterModal(false);
                    openAddItem(newChapterName.trim(), newLessonName.trim() || 'Lesson 1');
                  }}
                >
                  Continue to Add Item →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Preset Templates ── */}
      {showTemplateModal && (
        <TemplateModal
          courseName={courseName}
          groupName={groupName}
          onClose={() => setShowTemplateModal(false)}
          onApplied={() => {
            setShowTemplateModal(false);
            fetchData();
          }}
        />
      )}

      {/* ── Modal: Edit Item ── */}
      {editingItem && (
        <EditItemModal
          unified={editingItem}
          allVideos={allAvailableVideos}
          allAssignments={allAvailableAssignments}
          onClose={() => setEditingItem(null)}
          onUpdated={() => {
            setEditingItem(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Item Row Component
// ─────────────────────────────────────────────────────────────────────────────
function WorkflowItemRow({
  unified,
  stepNumber,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  courseName,
  groupName,
  isAdmin,
  allVideos,
  allAssignments,
}: {
  unified: UnifiedItem;
  stepNumber: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  courseName: string;
  groupName: string;
  isAdmin: boolean;
  allVideos: WorkflowVideo[];
  allAssignments: WorkflowAssignment[];
}) {
  const isVideo = unified.kind === 'video';
  const item = unified.item;

  const isQuiz = !isVideo && (item as WorkflowAssignment).type === 'QUIZ';
  const isHW = !isVideo && (item as WorkflowAssignment).type === 'HOMEWORK';

  // Find prerequisite name
  const prereqText = useMemo(() => {
    if (!item.unlockRule || item.unlockRule === 'NONE') return 'Available immediately';
    if (item.unlockRule === 'WATCH_VIDEO') {
      const v = allVideos.find(x => x.id === item.unlockVideoId);
      return `After watching ${item.unlockPercent || 80}% of video "${v?.title || 'previous video'}"`;
    }
    if (item.unlockRule === 'PASS_QUIZ') {
      const a = allAssignments.find(x => x.id === item.unlockAssignmentId);
      return `After passing quiz "${a?.title || 'previous quiz'}" with at least ${item.unlockScore || 50}%`;
    }
    if (item.unlockRule === 'SUBMIT_ASSIGNMENT') {
      const a = allAssignments.find(x => x.id === item.unlockAssignmentId);
      return `After submitting homework "${a?.title || 'previous homework'}"`;
    }
    return item.unlockRule;
  }, [item, allVideos, allAssignments]);

  const isPrereqActive = item.unlockRule && item.unlockRule !== 'NONE';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
    }}>
      {/* Order Badge */}
      <span style={{
        width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.12)',
        color: 'var(--primary-light)', fontSize: 12, fontWeight: 700,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        #{stepNumber}
      </span>

      {/* Type Icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: isVideo ? 'rgba(59,130,246,0.12)' : isQuiz ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {isVideo ? (
          <VideoIcon size={18} style={{ color: '#3b82f6' }} />
        ) : isQuiz ? (
          <ClipboardList size={18} style={{ color: '#8b5cf6' }} />
        ) : (
          <FileText size={18} style={{ color: '#f59e0b' }} />
        )}
      </div>

      {/* Main Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{item.title}</strong>
          {isVideo && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
              {(item as WorkflowVideo).provider === 'bunny' ? '🐰 Bunny Stream' : (item as WorkflowVideo).provider || 'Video'}
            </span>
          )}
          {isQuiz && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(139,92,246,0.12)', color: '#c084fc' }}>
              Quiz ({(item as WorkflowAssignment).maxGrade || 100} pts)
            </span>
          )}
          {isHW && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
              Homework
            </span>
          )}
        </div>

        {/* Prerequisite & Unlock Rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4, color: isPrereqActive ? '#38bdf8' : 'var(--text-muted)' }}>
          {isPrereqActive ? <Lock size={12} /> : <Unlock size={12} />}
          <span>{prereqText}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Reorder Buttons */}
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="icon-btn"
          title="Move up"
          style={{ opacity: isFirst ? 0.3 : 1 }}
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="icon-btn"
          title="Move down"
          style={{ opacity: isLast ? 0.3 : 1 }}
        >
          <ArrowDown size={14} />
        </button>

        {/* Specialized Builders */}
        {isQuiz && (
          <Link
            href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/quiz/${item.id}`}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            title="Edit Quiz Questions"
          >
            Questions <ExternalLink size={11} />
          </Link>
        )}
        {!isVideo && (
          <Link
            href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/submissions/${item.id}`}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            title="View Student Submissions & Grades"
          >
            Submissions <ExternalLink size={11} />
          </Link>
        )}

        {/* Edit & Delete */}
        <button onClick={onEdit} className="icon-btn" title="Edit Item Settings">
          <Edit3 size={14} />
        </button>
        <button onClick={onDelete} className="icon-btn" title="Delete Item" style={{ color: '#ef4444' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Add Item to Lesson
// ─────────────────────────────────────────────────────────────────────────────
function AddItemModal({
  chapterName,
  lessonName,
  courseName,
  groupName,
  allVideos,
  allAssignments,
  onClose,
  onCreated,
  router,
}: {
  chapterName: string;
  lessonName: string;
  courseName: string;
  groupName: string;
  allVideos: WorkflowVideo[];
  allAssignments: WorkflowAssignment[];
  onClose: () => void;
  onCreated: () => void;
  router: any;
}) {
  const [kind, setKind] = useState<'VIDEO' | 'QUIZ' | 'HOMEWORK'>('VIDEO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [provider, setProvider] = useState<'bunny' | 'youtube' | 'vimeo' | 'wistia'>('bunny');
  const [maxGrade, setMaxGrade] = useState('100');
  const [dueDate, setDueDate] = useState('');

  // Unlock rules
  const [unlockRule, setUnlockRule] = useState('NONE');
  const [unlockVideoId, setUnlockVideoId] = useState('');
  const [unlockPercent, setUnlockPercent] = useState('80');
  const [unlockAssignmentId, setUnlockAssignmentId] = useState('');
  const [unlockScore, setUnlockScore] = useState('60');

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (kind === 'VIDEO') {
        if (!sourceUrl.trim()) { toast.error('Video link or embed code is required'); setSaving(false); return; }
        await videosApi.create({
          courseName,
          groupName,
          title: title.trim(),
          description: description.trim() || undefined,
          provider,
          sourceUrl: sourceUrl.trim(),
          chapterName,
          lessonName,
          unlockRule,
          unlockVideoId: unlockRule === 'WATCH_VIDEO' ? unlockVideoId : undefined,
          unlockPercent: unlockRule === 'WATCH_VIDEO' ? +unlockPercent : undefined,
          unlockAssignmentId: (unlockRule === 'PASS_QUIZ' || unlockRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : undefined,
          unlockScore: unlockRule === 'PASS_QUIZ' ? +unlockScore : undefined,
        });
        toast.success('Video added to lesson!');
        onCreated();
      } else {
        const res = await assignmentsApi.create({
          courseName,
          groupName,
          type: kind,
          title: title.trim(),
          description: description.trim() || undefined,
          chapterName,
          lessonName,
          maxGrade: +maxGrade || 100,
          dueDate: dueDate || undefined,
          unlockRule,
          unlockVideoId: unlockRule === 'WATCH_VIDEO' ? unlockVideoId : undefined,
          unlockPercent: unlockRule === 'WATCH_VIDEO' ? +unlockPercent : undefined,
          unlockAssignmentId: (unlockRule === 'PASS_QUIZ' || unlockRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : undefined,
          unlockScore: unlockRule === 'PASS_QUIZ' ? +unlockScore : undefined,
        });
        toast.success(`${kind === 'QUIZ' ? 'Quiz' : 'Homework'} created!`);
        onCreated();
        if (kind === 'QUIZ') {
          router.push(`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/quiz/${(res.data as any).id}`);
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20, overflowY: 'auto',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Item to {lessonName}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chapter: {chapterName}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Item Type Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`btn ${kind === 'VIDEO' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('VIDEO')}
            style={{ fontSize: 13, justifyContent: 'center' }}
          >
            <VideoIcon size={14} /> Video
          </button>
          <button
            type="button"
            className={`btn ${kind === 'QUIZ' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('QUIZ')}
            style={{ fontSize: 13, justifyContent: 'center' }}
          >
            <ClipboardList size={14} /> Quiz
          </button>
          <button
            type="button"
            className={`btn ${kind === 'HOMEWORK' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('HOMEWORK')}
            style={{ fontSize: 13, justifyContent: 'center' }}
          >
            <FileText size={14} /> Homework
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                kind === 'VIDEO'
                  ? 'e.g. Lecture 1: Motion in One Dimension'
                  : kind === 'QUIZ'
                  ? 'e.g. Pre-lesson Quiz or Post-lesson Quiz'
                  : 'e.g. Homework Assignment 1'
              }
            />
          </div>

          {kind === 'VIDEO' && (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-input" value={provider} onChange={e => setProvider(e.target.value as any)}>
                  <option value="bunny">🐰 Bunny Stream</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="wistia">Wistia</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Video URL or Embed code *</label>
                <input
                  className="form-input"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder={
                    provider === 'bunny'
                      ? 'https://iframe.mediadelivery.net/embed/...'
                      : 'https://www.youtube.com/watch?v=...'
                  }
                />
              </div>
            </div>
          )}

          {kind !== 'VIDEO' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Max Grade</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxGrade}
                  onChange={e => setMaxGrade(e.target.value)}
                />
              </div>
              {kind === 'HOMEWORK' && (
                <div className="form-group">
                  <label className="form-label">Due Date (optional)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Instructions or notes for students..."
            />
          </div>

          {/* ── Unlock Prerequisite Rules ── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14,
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} style={{ color: 'var(--primary)' }} /> Unlock Rule (Prerequisites)
            </label>
            <select className="form-input" value={unlockRule} onChange={e => setUnlockRule(e.target.value)}>
              <option value="NONE">🟢 Available immediately</option>
              <option value="WATCH_VIDEO">🟣 After watching previous video</option>
              <option value="PASS_QUIZ">🔵 After passing quiz with minimum score</option>
              <option value="SUBMIT_ASSIGNMENT">🟠 After submitting homework</option>
            </select>

            {unlockRule === 'WATCH_VIDEO' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
                <select className="form-input" value={unlockVideoId} onChange={e => setUnlockVideoId(e.target.value)}>
                  <option value="">Select prerequisite video</option>
                  {allVideos.map(v => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="form-input"
                  placeholder="Min %"
                  value={unlockPercent}
                  onChange={e => setUnlockPercent(e.target.value)}
                />
              </div>
            )}

            {(unlockRule === 'PASS_QUIZ' || unlockRule === 'SUBMIT_ASSIGNMENT') && (
              <div style={{ display: 'grid', gridTemplateColumns: unlockRule === 'PASS_QUIZ' ? '1fr 110px' : '1fr', gap: 8 }}>
                <select className="form-input" value={unlockAssignmentId} onChange={e => setUnlockAssignmentId(e.target.value)}>
                  <option value="">Select prerequisite assignment</option>
                  {allAssignments
                    .filter(a => unlockRule === 'PASS_QUIZ' ? a.type === 'QUIZ' : a.type === 'HOMEWORK')
                    .map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                </select>
                {unlockRule === 'PASS_QUIZ' && (
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="form-input"
                    placeholder="Min %"
                    value={unlockScore}
                    onChange={e => setUnlockScore(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : (kind === 'QUIZ' ? 'Create & Build Quiz →' : 'Create Item')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Edit Item
// ─────────────────────────────────────────────────────────────────────────────
function EditItemModal({
  unified,
  allVideos,
  allAssignments,
  onClose,
  onUpdated,
}: {
  unified: UnifiedItem;
  allVideos: WorkflowVideo[];
  allAssignments: WorkflowAssignment[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const isVideo = unified.kind === 'video';
  const item = unified.item;

  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [chapterName, setChapterName] = useState(item.chapterName || '');
  const [lessonName, setLessonName] = useState(item.lessonName || '');
  const [sourceUrl, setSourceUrl] = useState('');
  const [provider, setProvider] = useState(isVideo ? (item as WorkflowVideo).provider || 'bunny' : 'bunny');
  const [maxGrade, setMaxGrade] = useState(!isVideo ? String((item as WorkflowAssignment).maxGrade || 100) : '100');
  const [dueDate, setDueDate] = useState(!isVideo && (item as WorkflowAssignment).dueDate ? (item as WorkflowAssignment).dueDate!.substring(0, 16) : '');
  const [unlockRule, setUnlockRule] = useState(item.unlockRule || 'NONE');
  const [unlockVideoId, setUnlockVideoId] = useState(item.unlockVideoId || '');
  const [unlockPercent, setUnlockPercent] = useState(String(item.unlockPercent || 80));
  const [unlockAssignmentId, setUnlockAssignmentId] = useState(item.unlockAssignmentId || '');
  const [unlockScore, setUnlockScore] = useState(String(item.unlockScore || 60));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        chapterName: chapterName.trim() || null,
        lessonName: lessonName.trim() || null,
        unlockRule,
        unlockVideoId: unlockRule === 'WATCH_VIDEO' ? unlockVideoId : null,
        unlockPercent: unlockRule === 'WATCH_VIDEO' ? +unlockPercent : null,
        unlockAssignmentId: (unlockRule === 'PASS_QUIZ' || unlockRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : null,
        unlockScore: unlockRule === 'PASS_QUIZ' ? +unlockScore : null,
      };

      if (isVideo) {
        if (sourceUrl.trim()) {
          payload.sourceUrl = sourceUrl.trim();
          payload.provider = provider;
        }
        await videosApi.update(item.id, payload);
      } else {
        payload.maxGrade = +maxGrade || 100;
        payload.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
        await assignmentsApi.update(item.id, payload);
      }

      toast.success('Updated successfully');
      onUpdated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20, overflowY: 'auto',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Item: {item.title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {isVideo ? (
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-input" value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="bunny">🐰 Bunny Stream</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="wistia">Wistia</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Update Video Link / Embed</label>
                <input
                  className="form-input"
                  placeholder="Paste new link or leave blank to keep"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Max Grade</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxGrade}
                  onChange={e => setMaxGrade(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Chapter</label>
              <input className="form-input" value={chapterName} onChange={e => setChapterName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Lesson</label>
              <input className="form-input" value={lessonName} onChange={e => setLessonName(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Prerequisite Rules */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14,
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} style={{ color: 'var(--primary)' }} /> Unlock Rule (Prerequisites)
            </label>
            <select className="form-input" value={unlockRule} onChange={e => setUnlockRule(e.target.value)}>
              <option value="NONE">🟢 Available immediately</option>
              <option value="WATCH_VIDEO">🟣 After watching previous video</option>
              <option value="PASS_QUIZ">🔵 After passing quiz with minimum score</option>
              <option value="SUBMIT_ASSIGNMENT">🟠 After submitting homework</option>
            </select>

            {unlockRule === 'WATCH_VIDEO' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
                <select className="form-input" value={unlockVideoId} onChange={e => setUnlockVideoId(e.target.value)}>
                  <option value="">Select video</option>
                  {allVideos.filter(v => v.id !== item.id).map(v => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
                <input type="number" min={1} max={100} className="form-input" placeholder="Min %" value={unlockPercent} onChange={e => setUnlockPercent(e.target.value)} />
              </div>
            )}

            {(unlockRule === 'PASS_QUIZ' || unlockRule === 'SUBMIT_ASSIGNMENT') && (
              <div style={{ display: 'grid', gridTemplateColumns: unlockRule === 'PASS_QUIZ' ? '1fr 110px' : '1fr', gap: 8 }}>
                <select className="form-input" value={unlockAssignmentId} onChange={e => setUnlockAssignmentId(e.target.value)}>
                  <option value="">Select assignment</option>
                  {allAssignments
                    .filter(a => a.id !== item.id && (unlockRule === 'PASS_QUIZ' ? a.type === 'QUIZ' : a.type === 'HOMEWORK'))
                    .map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                </select>
                {unlockRule === 'PASS_QUIZ' && (
                  <input type="number" min={1} max={100} className="form-input" placeholder="Min %" value={unlockScore} onChange={e => setUnlockScore(e.target.value)} />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Preset Templates
// ─────────────────────────────────────────────────────────────────────────────
function TemplateModal({
  courseName,
  groupName,
  onClose,
  onApplied,
}: {
  courseName: string;
  groupName: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [chapter, setChapter] = useState('Chapter 1');
  const [lesson, setLesson] = useState('Lesson 1');
  const [templateType, setTemplateType] = useState<'SCIENCE' | 'LANGUAGES' | 'MATH'>('SCIENCE');
  const [applying, setApplying] = useState(false);

  const apply = async () => {
    setApplying(true);
    try {
      if (templateType === 'SCIENCE') {
        // Step 1: Pre-quiz
        const preQuiz = await assignmentsApi.create({
          courseName, groupName, type: 'QUIZ', title: 'Pre-Lesson Quiz (كويز قبل الحصة)',
          chapterName: chapter, lessonName: lesson, contentOrder: 1, unlockRule: 'NONE', maxGrade: 10,
        });
        // Step 2: Lecture Video
        const video = await videosApi.create({
          courseName, groupName, title: 'Lecture Video (فيديو الشرح)',
          chapterName: chapter, lessonName: lesson, contentOrder: 2, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/demo-video-guid',
          unlockRule: 'PASS_QUIZ', unlockAssignmentId: (preQuiz.data as any).id, unlockScore: 50,
        });
        // Step 3: Post-quiz
        const postQuiz = await assignmentsApi.create({
          courseName, groupName, type: 'QUIZ', title: 'Post-Lesson Quiz (كويز بعد الحصة)',
          chapterName: chapter, lessonName: lesson, contentOrder: 3,
          unlockRule: 'WATCH_VIDEO', unlockVideoId: (video.data as any).id, unlockPercent: 80, maxGrade: 10,
        });
        // Step 4: Homework
        const hw = await assignmentsApi.create({
          courseName, groupName, type: 'HOMEWORK', title: 'Homework Assignment (الواجب المنزلي)',
          chapterName: chapter, lessonName: lesson, contentOrder: 4,
          unlockRule: 'PASS_QUIZ', unlockAssignmentId: (postQuiz.data as any).id, unlockScore: 60, maxGrade: 20,
        });
        // Step 5: HW Solution Video
        await videosApi.create({
          courseName, groupName, title: 'Homework Solution (فيديو حل الواجب)',
          chapterName: chapter, lessonName: lesson, contentOrder: 5, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/solution-video-guid',
          unlockRule: 'SUBMIT_ASSIGNMENT', unlockAssignmentId: (hw.data as any).id,
        });
      } else if (templateType === 'LANGUAGES') {
        // Step 1: Lecture Video
        const video = await videosApi.create({
          courseName, groupName, title: 'Grammar & Vocabulary Lecture (فيديو الشرح)',
          chapterName: chapter, lessonName: lesson, contentOrder: 1, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/demo-video-guid', unlockRule: 'NONE',
        });
        // Step 2: Homework
        const hw = await assignmentsApi.create({
          courseName, groupName, type: 'HOMEWORK', title: 'Exercises & Writing Practice (تدريبات الواجب)',
          chapterName: chapter, lessonName: lesson, contentOrder: 2,
          unlockRule: 'WATCH_VIDEO', unlockVideoId: (video.data as any).id, unlockPercent: 80, maxGrade: 20,
        });
        // Step 3: Unit Exam
        await assignmentsApi.create({
          courseName, groupName, type: 'QUIZ', title: 'Lesson Comprehensive Quiz (امتحان الحصة)',
          chapterName: chapter, lessonName: lesson, contentOrder: 3,
          unlockRule: 'SUBMIT_ASSIGNMENT', unlockAssignmentId: (hw.data as any).id, maxGrade: 20,
        });
      } else {
        // Math Template
        const video = await videosApi.create({
          courseName, groupName, title: 'Concept & Proofs (فيديو شرح النظريات)',
          chapterName: chapter, lessonName: lesson, contentOrder: 1, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/demo-video-guid', unlockRule: 'NONE',
        });
        const hw = await assignmentsApi.create({
          courseName, groupName, type: 'HOMEWORK', title: 'Problem Set (مسائل وتدريبات)',
          chapterName: chapter, lessonName: lesson, contentOrder: 2,
          unlockRule: 'WATCH_VIDEO', unlockVideoId: (video.data as any).id, unlockPercent: 70, maxGrade: 20,
        });
        const solVideo = await videosApi.create({
          courseName, groupName, title: 'Problems Solution Video (حل المسائل والأفكار)',
          chapterName: chapter, lessonName: lesson, contentOrder: 3, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/solution-video-guid',
          unlockRule: 'SUBMIT_ASSIGNMENT', unlockAssignmentId: (hw.data as any).id,
        });
        await assignmentsApi.create({
          courseName, groupName, type: 'QUIZ', title: 'Quick Speed Quiz (كويز سريع)',
          chapterName: chapter, lessonName: lesson, contentOrder: 4,
          unlockRule: 'WATCH_VIDEO', unlockVideoId: (solVideo.data as any).id, unlockPercent: 80, maxGrade: 10,
        });
      }

      toast.success('Template applied successfully with sequential unlock rules!');
      onApplied();
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: '#f59e0b' }} /> Apply Preset Workflow Template
          </h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Automatically builds a standardized lesson pipeline with linked unlock rules:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Target Chapter</label>
            <input className="form-input" value={chapter} onChange={e => setChapter(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Target Lesson</label>
            <input className="form-input" value={lesson} onChange={e => setLesson(e.target.value)} />
          </div>
        </div>

        {/* Template choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <label
            onClick={() => setTemplateType('SCIENCE')}
            style={{
              padding: 12, borderRadius: 10, border: `2px solid ${templateType === 'SCIENCE' ? 'var(--primary)' : 'var(--border)'}`,
              background: templateType === 'SCIENCE' ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>🧪 Science / Physics Pipeline (قالب الفيزياء والعلوم)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Pre-quiz ➔ Lecture Video ➔ Post-quiz ➔ Homework ➔ Solution Video
            </div>
          </label>

          <label
            onClick={() => setTemplateType('LANGUAGES')}
            style={{
              padding: 12, borderRadius: 10, border: `2px solid ${templateType === 'LANGUAGES' ? 'var(--primary)' : 'var(--border)'}`,
              background: templateType === 'LANGUAGES' ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>🌍 Languages Pipeline (قالب اللغات)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Lecture Video ➔ Homework Practice ➔ Comprehensive Lesson Quiz
            </div>
          </label>

          <label
            onClick={() => setTemplateType('MATH')}
            style={{
              padding: 12, borderRadius: 10, border: `2px solid ${templateType === 'MATH' ? 'var(--primary)' : 'var(--border)'}`,
              background: templateType === 'MATH' ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>📐 Math Pipeline (قالب الرياضيات)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Theories Video ➔ Problem Set ➔ Solutions Video ➔ Quick Speed Quiz
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={applying} onClick={apply}>
            {applying ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : 'Apply Template Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
