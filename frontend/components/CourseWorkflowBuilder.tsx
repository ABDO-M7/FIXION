'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, Video as VideoIcon, ClipboardList, Plus, Trash2, Edit3,
  ArrowUp, ArrowDown, ExternalLink, Sparkles, CheckCircle2,
  Lock, Unlock, Clock, FileText, ChevronDown, ChevronRight, X, AlertCircle,
  Paperclip, FileUp, Link2, Loader2, Download
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { assignmentsApi, videosApi, uploadsApi } from '@/lib/api';

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
  attachments?: string[];
  createdAt?: string;
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
  attachments?: string[];
  createdAt?: string;
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

    const reordered = [...lessonItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await Promise.all(
        reordered.map((unified, idx) => {
          const newOrder = idx + 1;
          return unified.kind === 'video'
            ? videosApi.update(unified.item.id, { contentOrder: newOrder })
            : assignmentsApi.update(unified.item.id, { contentOrder: newOrder });
        })
      );

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
                      const sortedItems = [...items].sort((a, b) => {
                        const diff = (a.item.contentOrder ?? 0) - (b.item.contentOrder ?? 0);
                        if (diff !== 0) return diff;
                        const timeA = a.item.createdAt ? new Date(a.item.createdAt).getTime() : 0;
                        const timeB = b.item.createdAt ? new Date(b.item.createdAt).getTime() : 0;
                        return timeA - timeB;
                      });
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
                              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <BookOpen size={15} style={{ color: 'var(--primary-light)' }} />
                                {lessonName}
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
          existingLessonItems={hierarchy.get(activeChapter)?.get(activeLesson) || []}
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
  const isDoc = isVideo && (item as WorkflowVideo).provider === 'document';
  const isQuiz = !isVideo && (item as WorkflowAssignment).type === 'QUIZ';
  const isHW = !isVideo && (item as WorkflowAssignment).type === 'HOMEWORK';

  // Find prerequisite name
  const prereqText = useMemo(() => {
    if (!item.unlockRule || item.unlockRule === 'NONE') return 'Available immediately';
    if (item.unlockRule === 'WATCH_VIDEO') {
      const v = allVideos.find(x => x.id === item.unlockVideoId);
      return `After watching ${item.unlockPercent || 100}% of video "${v?.title || 'previous video'}"`;
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
        background: isDoc ? 'rgba(14,165,233,0.12)' : isVideo ? 'rgba(59,130,246,0.12)' : isQuiz ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {isDoc ? (
          <FileText size={18} style={{ color: '#0ea5e9' }} />
        ) : isVideo ? (
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
          {isDoc && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(14,165,233,0.12)', color: '#38bdf8' }}>
              ملف / ملزمة (PDF)
            </span>
          )}
          {isVideo && !isDoc && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
              {(item as WorkflowVideo).provider === 'bunny' ? 'Bunny Stream' : (item as WorkflowVideo).provider || 'Video'}
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
          {item.attachments && item.attachments.length > 0 && (
            <span className="badge" style={{ fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Paperclip size={10} />
              {item.attachments.length} {item.attachments.length === 1 ? 'ملف مرفق / PDF' : 'ملفات مرفقة'}
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
// Sub-component: Attachments Manager (PDF Upload / Google Drive Link)
// ─────────────────────────────────────────────────────────────────────────────
function AttachmentsManager({
  attachments,
  onChange,
}: {
  attachments: string[];
  onChange: (attachments: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('حجم الملف يجب ألا يتجاوز 25 ميجابايت');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      onChange([...attachments, res.data.url]);
      toast.success('تم رفع الملف بنجاح');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    const trimmed = externalUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.error('يرجى إدخال رابط صالح يبدأ بـ https://');
      return;
    }
    onChange([...attachments, trimmed]);
    setExternalUrl('');
    toast.success('تمت إضافة الرابط بنجاح');
  };

  const handleRemove = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 10,
      padding: 14,
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
        <Paperclip size={14} style={{ color: '#ef4444' }} />
        ملفات الحصة / ملزمة الدرس (PDF أو رابط Google Drive)
      </label>

      {/* Upload button & external link input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 }}
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} style={{ color: '#ef4444' }} />}
            {uploading ? 'جاري رفع الملف...' : 'رفع ملف PDF من الجهاز'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>أو ضع رابط من Google Drive بالأسفل</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Link2 size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32, fontSize: 12 }}
              placeholder="رابط خارجي مثل https://drive.google.com/file/d/..."
              value={externalUrl}
              onChange={e => setExternalUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddLink}
            disabled={!externalUrl.trim()}
            style={{ fontSize: 12, flexShrink: 0 }}
          >
            + إضافة الرابط
          </button>
        </div>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {attachments.map((url, i) => {
            const isDrive = url.includes('drive.google.com');
            const isPdf = url.toLowerCase().endsWith('.pdf');
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  {isDrive ? (
                    <ExternalLink size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
                  ) : isPdf ? (
                    <FileText size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  ) : (
                    <Paperclip size={14} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '85%',
                    }}
                    title={url}
                  >
                    {isDrive ? `رابط Google Drive (${i + 1})` : isPdf ? decodeURIComponent(url.split('/').pop() || 'ملف PDF') : url}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="icon-btn"
                    title="فتح الرابط"
                    style={{ padding: 4 }}
                  >
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="icon-btn"
                    title="حذف"
                    style={{ color: '#ef4444', padding: 4 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Unified Prerequisite Lock Selector
// ─────────────────────────────────────────────────────────────────────────────
function PrerequisiteLockSelector({
  allVideos,
  allAssignments,
  currentId,
  unlockRule,
  unlockVideoId,
  unlockAssignmentId,
  unlockPercent,
  unlockScore,
  onChange,
}: {
  allVideos: WorkflowVideo[];
  allAssignments: WorkflowAssignment[];
  currentId?: string;
  unlockRule: string;
  unlockVideoId: string;
  unlockAssignmentId: string;
  unlockPercent: string;
  unlockScore: string;
  onChange: (data: {
    unlockRule: string;
    unlockVideoId: string;
    unlockAssignmentId: string;
    unlockPercent: string;
    unlockScore: string;
  }) => void;
}) {
  const isLocked = unlockRule !== 'NONE';

  // Group all available items by chapter & lesson
  const groupedContent = useMemo(() => {
    const chaptersMap = new Map<string, Map<string, Array<{
      id: string;
      kind: 'video' | 'quiz' | 'homework' | 'document';
      title: string;
      valueKey: string;
    }>>>();

    const add = (chapter: string | null | undefined, lesson: string | null | undefined, item: any) => {
      if (currentId && item.id === currentId) return;
      const ch = chapter?.trim() || 'General Chapter';
      const ls = lesson?.trim() || 'Lesson 1';
      if (!chaptersMap.has(ch)) chaptersMap.set(ch, new Map());
      const lsMap = chaptersMap.get(ch)!;
      if (!lsMap.has(ls)) lsMap.set(ls, []);
      lsMap.get(ls)!.push(item);
    };

    allVideos.forEach(v => {
      const isDoc = v.provider === 'document';
      add(v.chapterName, v.lessonName, {
        id: v.id,
        kind: isDoc ? 'document' : 'video',
        title: v.title,
        valueKey: `video:${v.id}`,
      });
    });

    allAssignments.forEach(a => {
      add(a.chapterName, a.lessonName, {
        id: a.id,
        kind: a.type === 'QUIZ' ? 'quiz' : 'homework',
        title: a.title,
        valueKey: `assignment:${a.id}`,
      });
    });

    return chaptersMap;
  }, [allVideos, allAssignments, currentId]);

  // Current selected key
  const selectedKey = useMemo(() => {
    if (unlockRule === 'WATCH_VIDEO' && unlockVideoId) return `video:${unlockVideoId}`;
    if ((unlockRule === 'PASS_QUIZ' || unlockRule === 'SUBMIT_ASSIGNMENT') && unlockAssignmentId) return `assignment:${unlockAssignmentId}`;
    return '';
  }, [unlockRule, unlockVideoId, unlockAssignmentId]);

  // Find selected item kind
  const selectedItemKind = useMemo(() => {
    if (selectedKey.startsWith('video:')) {
      const id = selectedKey.replace('video:', '');
      const v = allVideos.find(x => x.id === id);
      return v?.provider === 'document' ? 'document' : 'video';
    }
    if (selectedKey.startsWith('assignment:')) {
      const id = selectedKey.replace('assignment:', '');
      const a = allAssignments.find(x => x.id === id);
      return a?.type === 'QUIZ' ? 'quiz' : 'homework';
    }
    return null;
  }, [selectedKey, allVideos, allAssignments]);

  const handleSelect = (key: string) => {
    if (!key) {
      onChange({
        unlockRule: 'SELECT_REQUIRED',
        unlockVideoId: '',
        unlockAssignmentId: '',
        unlockPercent,
        unlockScore,
      });
      return;
    }

    if (key.startsWith('video:')) {
      const id = key.replace('video:', '');
      const v = allVideos.find(x => x.id === id);
      const isDoc = v?.provider === 'document';
      onChange({
        unlockRule: 'WATCH_VIDEO',
        unlockVideoId: id,
        unlockAssignmentId: '',
        unlockPercent: isDoc ? '100' : (unlockPercent || '100'),
        unlockScore,
      });
    } else {
      const id = key.replace('assignment:', '');
      const a = allAssignments.find(x => x.id === id);
      if (a?.type === 'QUIZ') {
        onChange({
          unlockRule: 'PASS_QUIZ',
          unlockVideoId: '',
          unlockAssignmentId: id,
          unlockPercent,
          unlockScore: unlockScore || '50',
        });
      } else {
        onChange({
          unlockRule: 'SUBMIT_ASSIGNMENT',
          unlockVideoId: '',
          unlockAssignmentId: id,
          unlockPercent,
          unlockScore,
        });
      }
    }
  };

  const handleToggleLock = (active: boolean) => {
    if (!active) {
      onChange({
        unlockRule: 'NONE',
        unlockVideoId: '',
        unlockAssignmentId: '',
        unlockPercent: '',
        unlockScore: '',
      });
    } else {
      // User must choose prerequisite explicitly - no auto-default video or 80%
      onChange({
        unlockRule: 'SELECT_REQUIRED',
        unlockVideoId: '',
        unlockAssignmentId: '',
        unlockPercent: '',
        unlockScore: '',
      });
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
      padding: 14,
      border: isLocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
          <Lock size={15} style={{ color: isLocked ? '#ef4444' : 'var(--text-muted)' }} />
          قفل هذا العنصر بربطه بمحتوى أو حصة سابقة (Unlock Prerequisite)
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: isLocked ? '#f87171' : 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={isLocked}
            onChange={e => handleToggleLock(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ef4444' }}
          />
          {isLocked ? 'مقفول بمتطلب سابق' : 'متاح مباشرة (بدون قفل)'}
        </label>
      </div>

      {isLocked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>
              اختر المحتوى المطلوب إكماله من قائمة كل الحصص والواجبات:
            </label>
            <select
              className="form-input"
              value={selectedKey}
              onChange={e => handleSelect(e.target.value)}
            >
              <option value="">-- اضغط لاختيار المحتوى المطلوب لفتح هذا العنصر --</option>
              {Array.from(groupedContent.entries()).map(([ch, lsMap]) =>
                Array.from(lsMap.entries()).map(([ls, items]) => (
                  <optgroup key={`${ch}-${ls}`} label={`${ch} / ${ls}`}>
                    {items.map(it => (
                      <option key={it.valueKey} value={it.valueKey}>
                        {it.kind === 'document' ? '[ملف] ' : it.kind === 'video' ? '[حصة] ' : it.kind === 'quiz' ? '[كويز] ' : '[واجب] '}
                        {it.title}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>

          {selectedItemKind === 'video' && (
            <div style={{ background: 'rgba(59,130,246,0.08)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                  نسبة المشاهدة المطلوبة للفتح (%):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="form-input"
                    style={{ width: 75, padding: '4px 8px' }}
                    value={unlockPercent}
                    placeholder="100"
                    onChange={e => onChange({ unlockRule, unlockVideoId, unlockAssignmentId, unlockPercent: e.target.value, unlockScore })}
                  />
                  <span style={{ fontSize: 12 }}>%</span>
                </div>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                لن يتمكن الطالب من فتح هذا المحتوى إلا بعد أن يشاهد {unlockPercent || 100}% على الأقل من هذا الفيديو.
              </p>
            </div>
          )}

          {selectedItemKind === 'document' && (
            <div style={{ background: 'rgba(14,165,233,0.08)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(14,165,233,0.2)', fontSize: 12, color: 'var(--text-primary)' }}>
              <strong>تحميل / فتح الملف:</strong> سيتم فتح هذا المحتوى للطالب بعد توفر الملف ومراجعته.
            </div>
          )}

          {selectedItemKind === 'quiz' && (
            <div style={{ background: 'rgba(139,92,246,0.08)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                  نسبة النجاح المطلوبة في الكويز (%):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="form-input"
                    style={{ width: 75, padding: '4px 8px' }}
                    value={unlockScore}
                    placeholder="50"
                    onChange={e => onChange({ unlockRule, unlockVideoId, unlockAssignmentId, unlockPercent, unlockScore: e.target.value })}
                  />
                  <span style={{ fontSize: 12 }}>%</span>
                </div>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                يجب أن يحصل الطالب على درجة لا تقل عن {unlockScore || 50}% في هذا الكويز ليتم فتح العنصر.
              </p>
            </div>
          )}

          {selectedItemKind === 'homework' && (
            <div style={{ background: 'rgba(245,158,11,0.08)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: 'var(--text-primary)' }}>
              <strong>تسليم الواجب:</strong> سيتم فتح هذا العنصر للطالب تلقائياً بمجرد قيامه بتسليم الواجب المحدد.
            </div>
          )}
        </div>
      )}
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
  existingLessonItems = [],
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
  existingLessonItems?: UnifiedItem[];
  onClose: () => void;
  onCreated: () => void;
  router: any;
}) {
  const [kind, setKind] = useState<'VIDEO' | 'QUIZ' | 'HOMEWORK' | 'DOCUMENT'>('VIDEO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [provider, setProvider] = useState<'bunny' | 'youtube' | 'vimeo' | 'wistia'>('bunny');
  const [maxGrade, setMaxGrade] = useState('100');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  // Unlock rules - default NONE, no auto-lock or forced percentages
  const [unlockRule, setUnlockRule] = useState('NONE');
  const [unlockVideoId, setUnlockVideoId] = useState('');
  const [unlockPercent, setUnlockPercent] = useState('');
  const [unlockAssignmentId, setUnlockAssignmentId] = useState('');
  const [unlockScore, setUnlockScore] = useState('');

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return; }
    setSaving(true);

    // Calculate sequential order so newly added items are placed chronologically below prior items
    const maxOrder = existingLessonItems.reduce((max, u) => Math.max(max, u.item.contentOrder ?? 0), 0);
    const contentOrder = existingLessonItems.length > 0 ? maxOrder + 1 : 1;
    const effectiveRule = unlockRule === 'SELECT_REQUIRED' ? 'NONE' : unlockRule;

    try {
      if (kind === 'DOCUMENT') {
        if (attachments.length === 0 && !sourceUrl.trim()) {
          toast.error('يرجى رفع ملف PDF أو وضع رابط Google Drive للملف');
          setSaving(false);
          return;
        }
        await videosApi.create({
          courseName,
          groupName,
          title: title.trim(),
          description: description.trim() || undefined,
          provider: 'document',
          sourceUrl: sourceUrl.trim() || attachments[0],
          chapterName,
          lessonName,
          contentOrder,
          attachments,
          unlockRule: effectiveRule,
          unlockVideoId: effectiveRule === 'WATCH_VIDEO' ? unlockVideoId : undefined,
          unlockPercent: effectiveRule === 'WATCH_VIDEO' ? (+unlockPercent || 100) : undefined,
          unlockAssignmentId: (effectiveRule === 'PASS_QUIZ' || effectiveRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : undefined,
          unlockScore: effectiveRule === 'PASS_QUIZ' ? (+unlockScore || 50) : undefined,
        });
        toast.success('تمت إضافة الملف / الملزمة بنجاح');
        onCreated();
      } else if (kind === 'VIDEO') {
        if (!sourceUrl.trim()) { toast.error('رابط الفيديو أو كود التضمين مطلوب'); setSaving(false); return; }
        await videosApi.create({
          courseName,
          groupName,
          title: title.trim(),
          description: description.trim() || undefined,
          provider,
          sourceUrl: sourceUrl.trim(),
          chapterName,
          lessonName,
          contentOrder,
          attachments,
          unlockRule: effectiveRule,
          unlockVideoId: effectiveRule === 'WATCH_VIDEO' ? unlockVideoId : undefined,
          unlockPercent: effectiveRule === 'WATCH_VIDEO' ? (+unlockPercent || 100) : undefined,
          unlockAssignmentId: (effectiveRule === 'PASS_QUIZ' || effectiveRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : undefined,
          unlockScore: effectiveRule === 'PASS_QUIZ' ? (+unlockScore || 50) : undefined,
        });
        toast.success('تمت إضافة الحصة بنجاح');
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
          contentOrder,
          attachments,
          maxGrade: +maxGrade || 100,
          dueDate: dueDate || undefined,
          unlockRule: effectiveRule,
          unlockVideoId: effectiveRule === 'WATCH_VIDEO' ? unlockVideoId : undefined,
          unlockPercent: effectiveRule === 'WATCH_VIDEO' ? (+unlockPercent || 100) : undefined,
          unlockAssignmentId: (effectiveRule === 'PASS_QUIZ' || effectiveRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : undefined,
          unlockScore: effectiveRule === 'PASS_QUIZ' ? (+unlockScore || 50) : undefined,
        });
        toast.success(`تم إنشاء ${kind === 'QUIZ' ? 'الكويز' : 'الواجب'} بنجاح`);
        onCreated();
        if (kind === 'QUIZ') {
          router.push(`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/quiz/${(res.data as any).id}`);
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل إنشاء العنصر');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20, overflowY: 'auto',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>إضافة عنصر إلى {lessonName}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>الفصل: {chapterName}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Item Type Switcher (4 items) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
          <button
            type="button"
            className={`btn ${kind === 'VIDEO' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('VIDEO')}
            style={{ fontSize: 12, justifyContent: 'center', padding: '8px 6px' }}
          >
            <VideoIcon size={14} /> حصه / فيديو
          </button>
          <button
            type="button"
            className={`btn ${kind === 'QUIZ' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('QUIZ')}
            style={{ fontSize: 12, justifyContent: 'center', padding: '8px 6px' }}
          >
            <ClipboardList size={14} /> كويز
          </button>
          <button
            type="button"
            className={`btn ${kind === 'HOMEWORK' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('HOMEWORK')}
            style={{ fontSize: 12, justifyContent: 'center', padding: '8px 6px' }}
          >
            <FileText size={14} /> واجب
          </button>
          <button
            type="button"
            className={`btn ${kind === 'DOCUMENT' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setKind('DOCUMENT')}
            style={{ fontSize: 12, justifyContent: 'center', padding: '8px 6px' }}
          >
            <FileUp size={14} /> ملف / ملزمة
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">العنوان *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                kind === 'DOCUMENT'
                  ? 'مثال: ملزمة شرح الدرس الأول (PDF)'
                  : kind === 'VIDEO'
                  ? 'مثال: حصة 1: شرح الحركة في خط مستقيم'
                  : kind === 'QUIZ'
                  ? 'مثال: كويز بعد الحصة'
                  : 'مثال: واجب الدرس الأول'
              }
            />
          </div>

          {kind === 'VIDEO' && (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">السيرفر / المشغل</label>
                <select className="form-input" value={provider} onChange={e => setProvider(e.target.value as any)}>
                  <option value="bunny">Bunny Stream</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="wistia">Wistia</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">رابط الفيديو أو كود التضمين *</label>
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

          {(kind === 'QUIZ' || kind === 'HOMEWORK') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">الدرجة النهائية</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxGrade}
                  onChange={e => setMaxGrade(e.target.value)}
                />
              </div>
              {kind === 'HOMEWORK' && (
                <div className="form-group">
                  <label className="form-label">موعد التسليم الأخير (اختياري)</label>
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
            <label className="form-label">الوصف والتعليمات (اختياري)</label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ملاحظات أو تعليمات للطلاب..."
            />
          </div>

          {/* ── Attachments: PDF Upload & Google Drive Link ── */}
          <AttachmentsManager
            attachments={attachments}
            onChange={setAttachments}
          />

          {/* ── Unlock Prerequisite Rules with Unified Content Dropdown ── */}
          <PrerequisiteLockSelector
            allVideos={allVideos}
            allAssignments={allAssignments}
            unlockRule={unlockRule}
            unlockVideoId={unlockVideoId}
            unlockAssignmentId={unlockAssignmentId}
            unlockPercent={unlockPercent}
            unlockScore={unlockScore}
            onChange={data => {
              setUnlockRule(data.unlockRule);
              setUnlockVideoId(data.unlockVideoId);
              setUnlockAssignmentId(data.unlockAssignmentId);
              setUnlockPercent(data.unlockPercent);
              setUnlockScore(data.unlockScore);
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : (kind === 'QUIZ' ? 'إنشاء وبناء أسئلة الكويز' : 'إنشاء وحفظ')}
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
  const isDoc = isVideo && (item as WorkflowVideo).provider === 'document';

  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [chapterName, setChapterName] = useState(item.chapterName || '');
  const [lessonName, setLessonName] = useState(item.lessonName || '');
  const [sourceUrl, setSourceUrl] = useState('');
  const [provider, setProvider] = useState(isVideo ? (item as WorkflowVideo).provider || 'bunny' : 'bunny');
  const [maxGrade, setMaxGrade] = useState(!isVideo ? String((item as WorkflowAssignment).maxGrade || 100) : '100');
  const [dueDate, setDueDate] = useState(!isVideo && (item as WorkflowAssignment).dueDate ? (item as WorkflowAssignment).dueDate!.substring(0, 16) : '');
  const [attachments, setAttachments] = useState<string[]>((item as any).attachments || []);

  const [unlockRule, setUnlockRule] = useState(item.unlockRule || 'NONE');
  const [unlockVideoId, setUnlockVideoId] = useState(item.unlockVideoId || '');
  const [unlockPercent, setUnlockPercent] = useState(item.unlockPercent != null ? String(item.unlockPercent) : '');
  const [unlockAssignmentId, setUnlockAssignmentId] = useState(item.unlockAssignmentId || '');
  const [unlockScore, setUnlockScore] = useState(item.unlockScore != null ? String(item.unlockScore) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return; }
    setSaving(true);
    const effectiveRule = unlockRule === 'SELECT_REQUIRED' ? 'NONE' : unlockRule;
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        chapterName: chapterName.trim() || null,
        lessonName: lessonName.trim() || null,
        attachments,
        unlockRule: effectiveRule,
        unlockVideoId: effectiveRule === 'WATCH_VIDEO' ? unlockVideoId : null,
        unlockPercent: effectiveRule === 'WATCH_VIDEO' ? (+unlockPercent || 100) : null,
        unlockAssignmentId: (effectiveRule === 'PASS_QUIZ' || effectiveRule === 'SUBMIT_ASSIGNMENT') ? unlockAssignmentId : null,
        unlockScore: effectiveRule === 'PASS_QUIZ' ? (+unlockScore || 50) : null,
      };

      if (isDoc) {
        payload.provider = 'document';
        if (sourceUrl.trim()) payload.sourceUrl = sourceUrl.trim();
        await videosApi.update(item.id, payload);
      } else if (isVideo) {
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

      toast.success('تم التحديث بنجاح');
      onUpdated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل التحديث');
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
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {isDoc ? 'تعديل ملف / ملزمة (PDF): ' : isVideo ? 'تعديل الحصة: ' : 'تعديل العنصر: '}
            {item.title}
          </h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">العنوان *</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {isVideo && !isDoc && (
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">المشغل</label>
                <select className="form-input" value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="bunny">Bunny Stream</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="wistia">Wistia</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">تحديث رابط الفيديو</label>
                <input
                  className="form-input"
                  placeholder="ضع الرابط الجديد أو اتركه فارغاً للإبقاء عليه"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {!isVideo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">الدرجة النهائية</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxGrade}
                  onChange={e => setMaxGrade(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">موعد التسليم الأخير</label>
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
              <label className="form-label">الفصل (Chapter)</label>
              <input className="form-input" value={chapterName} onChange={e => setChapterName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">الدرس (Lesson)</label>
              <input className="form-input" value={lessonName} onChange={e => setLessonName(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">الوصف والتعليمات</label>
            <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* ── Attachments: PDF Upload & Google Drive Link ── */}
          <AttachmentsManager
            attachments={attachments}
            onChange={setAttachments}
          />

          {/* ── Prerequisite Rules ── */}
          <PrerequisiteLockSelector
            allVideos={allVideos}
            allAssignments={allAssignments}
            currentId={item.id}
            unlockRule={unlockRule}
            unlockVideoId={unlockVideoId}
            unlockAssignmentId={unlockAssignmentId}
            unlockPercent={unlockPercent}
            unlockScore={unlockScore}
            onChange={data => {
              setUnlockRule(data.unlockRule);
              setUnlockVideoId(data.unlockVideoId);
              setUnlockAssignmentId(data.unlockAssignmentId);
              setUnlockPercent(data.unlockPercent);
              setUnlockScore(data.unlockScore);
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : 'حفظ التعديلات'}
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
          unlockRule: 'NONE', maxGrade: 10,
        });
        // Step 4: Homework
        const hw = await assignmentsApi.create({
          courseName, groupName, type: 'HOMEWORK', title: 'Homework Assignment (الواجب المنزلي)',
          chapterName: chapter, lessonName: lesson, contentOrder: 4,
          unlockRule: 'NONE', maxGrade: 20,
        });
        // Step 5: HW Solution Video
        await videosApi.create({
          courseName, groupName, title: 'Homework Solution (فيديو حل الواجب)',
          chapterName: chapter, lessonName: lesson, contentOrder: 5, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/solution-video-guid',
          unlockRule: 'NONE',
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
          unlockRule: 'NONE', maxGrade: 20,
        });
        // Step 3: Unit Exam
        await assignmentsApi.create({
          courseName, groupName, type: 'QUIZ', title: 'Lesson Comprehensive Quiz (امتحان الحصة)',
          chapterName: chapter, lessonName: lesson, contentOrder: 3,
          unlockRule: 'NONE', maxGrade: 20,
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
          unlockRule: 'NONE', maxGrade: 20,
        });
        const solVideo = await videosApi.create({
          courseName, groupName, title: 'Problems Solution Video (حل المسائل والأفكار)',
          chapterName: chapter, lessonName: lesson, contentOrder: 3, provider: 'bunny',
          sourceUrl: 'https://iframe.mediadelivery.net/embed/demo/solution-video-guid',
          unlockRule: 'NONE',
        });
        await assignmentsApi.create({
          courseName, groupName, type: 'QUIZ', title: 'Quick Speed Quiz (كويز سريع)',
          chapterName: chapter, lessonName: lesson, contentOrder: 4,
          unlockRule: 'NONE', maxGrade: 10,
        });
      }

      toast.success('Template applied successfully');
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
          Automatically builds a standardized lesson pipeline:
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
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Science / Physics Pipeline (قالب الفيزياء والعلوم)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Pre-quiz → Lecture Video → Post-quiz → Homework → Solution Video
            </div>
          </label>

          <label
            onClick={() => setTemplateType('LANGUAGES')}
            style={{
              padding: 12, borderRadius: 10, border: `2px solid ${templateType === 'LANGUAGES' ? 'var(--primary)' : 'var(--border)'}`,
              background: templateType === 'LANGUAGES' ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Languages Pipeline (قالب اللغات)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Lecture Video → Homework Practice → Comprehensive Lesson Quiz
            </div>
          </label>

          <label
            onClick={() => setTemplateType('MATH')}
            style={{
              padding: 12, borderRadius: 10, border: `2px solid ${templateType === 'MATH' ? 'var(--primary)' : 'var(--border)'}`,
              background: templateType === 'MATH' ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Math Pipeline (قالب الرياضيات)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Theories Video → Problem Set → Solutions Video → Quick Speed Quiz
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
