'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi, videosApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, BookOpen, ClipboardList, Clock3, FileText, Search,
  TrendingUp, Users, Video, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Eye, ExternalLink, ShieldAlert, Unlock, Lock,
} from 'lucide-react';
import Link from 'next/link';

type AssignmentStat = {
  id: string;
  title: string;
  type: 'QUIZ' | 'HOMEWORK';
  maxGrade: number;
  chapterName?: string | null;
  lessonName?: string | null;
  dueDate?: string | null;
};

type VideoStat = {
  id: string;
  title: string;
  provider?: string;
  chapterName?: string | null;
  lessonName?: string | null;
  checkpointCount?: number;
};

type DocumentStat = {
  id: string;
  title: string;
  chapterName?: string | null;
  lessonName?: string | null;
};

type StudentAssignmentDetail = {
  submitted: boolean;
  grade: number | null;
  submittedAt: string | null;
  submissionId: string | null;
  proctoringViolations?: number;
  tabSwitches?: number;
  autoSubmitted?: boolean;
  isManuallyUnlocked?: boolean;
};

type StudentVideoDetail = {
  opened: boolean;
  watchedPercent: number;
  watchedSeconds: number;
  durationSeconds: number;
  solvedCheckpoints: number;
  totalCheckpoints: number;
  lastWatchedAt: string | null;
  isManuallyUnlocked?: boolean;
};

type StudentStat = {
  id: string;
  name: string | null;
  email: string | null;
  studentId: string | null;
  phone: string | null;
  parentPhone: string | null;
  level: string | null;
  submittedAssignments: number;
  unsubmittedAssignments?: number;
  gradedAssignments: number;
  pendingGradingAssignments?: number;
  averageGradePercent: number | null;
  openedVideos?: number;
  completedVideos: number;
  totalVideos: number;
  videoProgressPercent: number | null;
  openedDocumentsCount?: number;
  totalDocuments?: number;
  totalExamViolations?: number;
  lastActivityAt: string | null;
  assignmentGrades: Record<string, number | null>;
  assignmentDetails?: Record<string, StudentAssignmentDetail>;
  videoProgress: Record<string, number>;
  videoDetails?: Record<string, StudentVideoDetail>;
  documentOpens: Record<string, boolean>;
  manualUnlocks?: { videoIds: string[]; assignmentIds: string[] };
};

type GroupAnalytics = {
  summary: {
    studentCount: number;
    assignmentCount: number;
    videoCount: number;
    documentCount: number;
    averageGradePercent: number | null;
    assignmentSubmissionRate: number | null;
    videoCompletionRate: number | null;
    averageVideoWatchPercent?: number | null;
    documentOpenRate?: number | null;
  };
  assignments: AssignmentStat[];
  videos: VideoStat[];
  documents: DocumentStat[];
  students: StudentStat[];
};

type StudentFilter = 'ALL' | 'INCOMPLETE_VIDEOS' | 'MISSING_ASSIGNMENTS' | 'PENDING_GRADING' | 'UNOPENED_DOCS';

function percentage(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${value}%`;
}

function progressColor(value: number | null | undefined) {
  if (value === null || value === undefined) return 'var(--text-muted)';
  return value >= 75 ? '#34d399' : value >= 50 ? '#fbbf24' : '#fb7185';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'لا يوجد نشاط مسجل';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function GroupStatsPage() {
  const { courseName, groupName } = useParams<{ courseName: string; groupName: string }>();
  const course = decodeURIComponent(courseName);
  const group = decodeURIComponent(groupName);
  const [data, setData] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('ALL');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    assignmentsApi.groupAnalytics(course, group)
      .then(response => {
        if (active) setData(response.data);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        const message = requestError instanceof Error ? requestError.message : 'تعذر تحميل إحصائيات المجموعة.';
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [course, group]);

  const filteredStudents = useMemo(() => {
    const list = data?.students || [];
    const totalAssignments = data?.assignments?.length || 0;
    const totalVideos = data?.videos?.length || 0;
    const totalDocs = data?.documents?.length || 0;
    const needle = search.trim().toLocaleLowerCase();

    return list.filter(student => {
      if (needle) {
        const matchesSearch = [student.name, student.email, student.studentId, student.phone, student.parentPhone]
          .some(value => value?.toLocaleLowerCase().includes(needle));
        if (!matchesSearch) return false;
      }
      if (filter === 'INCOMPLETE_VIDEOS') {
        return totalVideos > 0 && student.completedVideos < totalVideos;
      }
      if (filter === 'MISSING_ASSIGNMENTS') {
        return totalAssignments > 0 && student.submittedAssignments < totalAssignments;
      }
      if (filter === 'PENDING_GRADING') {
        const pending = student.pendingGradingAssignments ?? (student.submittedAssignments - student.gradedAssignments);
        return pending > 0;
      }
      if (filter === 'UNOPENED_DOCS') {
        const openedDocs = student.openedDocumentsCount ?? Object.values(student.documentOpens || {}).filter(Boolean).length;
        return totalDocs > 0 && openedDocs < totalDocs;
      }
      return true;
    });
  }, [data, search, filter]);

  const handleToggleManualUnlock = async (studentId: string, itemType: 'VIDEO' | 'ASSIGNMENT', itemId: string, unlock: boolean) => {
    try {
      await videosApi.toggleManualUnlock({
        courseName: course,
        groupName: group,
        studentId,
        itemType,
        itemId,
        unlock,
      });
      toast.success(unlock ? 'تم فتح المحتوى وتجاوز الشروط لهذا الطالب' : 'تمت إعادة قفل المحتوى وتطبيق الشروط');
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: (prev.students || []).map(s => {
            if (s.id !== studentId) return s;
            if (itemType === 'VIDEO') {
              const prevDetail = s.videoDetails?.[itemId] || {
                opened: false, watchedPercent: 0, watchedSeconds: 0, durationSeconds: 0,
                solvedCheckpoints: 0, totalCheckpoints: 0, lastWatchedAt: null,
              };
              return {
                ...s,
                videoDetails: {
                  ...s.videoDetails,
                  [itemId]: { ...prevDetail, isManuallyUnlocked: unlock },
                },
              };
            } else {
              const prevDetail = s.assignmentDetails?.[itemId] || {
                submitted: false, grade: null, submittedAt: null, submissionId: null,
                proctoringViolations: 0, tabSwitches: 0, autoSubmitted: false, proctoring: null,
              };
              return {
                ...s,
                assignmentDetails: {
                  ...s.assignmentDetails,
                  [itemId]: { ...prevDetail, isManuallyUnlocked: unlock },
                },
              };
            }
          }),
        };
      });
    } catch {
      toast.error('تعذر تغيير حالة فتح المحتوى');
    }
  };

  const avgWatchPct = data?.summary?.averageVideoWatchPercent ?? data?.summary?.videoCompletionRate ?? null;

  return (
    <AppShell>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <Link
          href={`/teacher/courses/${encodeURIComponent(course)}/${encodeURIComponent(group)}`}
          className="btn btn-ghost btn-sm"
          style={{ paddingInlineStart: 0, marginBottom: 12 }}
        >
          <ArrowLeft size={14} /> العودة للكورس
        </Link>
        <header className="page-header" style={{ marginBottom: 24 }}>
          <div>
            <p className="page-subtitle" style={{ marginBottom: 4 }}>{course}</p>
            <h1 className="page-title" style={{ marginBottom: 6 }}>إحصائيات مجموعة {group}</h1>
            <p className="page-subtitle">متابعة دقيقة لكل طالب: نسبة المشاهدة الفعلية، الحصص والملفات التي فتحها أو لم يفتحها، والواجبات والكويزات التي حلّها أو لم يحلّها.</p>
          </div>
        </header>

        {loading ? (
          <div role="status" style={{ display: 'grid', placeItems: 'center', padding: 64 }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : error ? (
          <div className="card" role="alert" style={{ padding: 24, color: '#fb7185' }}>{error}</div>
        ) : !data ? (
          <div className="card" role="alert" style={{ padding: 24 }}>تعذر تحميل إحصائيات هذه المجموعة.</div>
        ) : (
          <>
            <section aria-label="ملخص أداء المجموعة" className="grid-3" style={{ gap: 14, marginBottom: 24 }}>
              <SummaryCard
                icon={<Users size={19} />}
                label="الطلاب المسجلون"
                value={String(data.summary.studentCount)}
                tone="#818cf8"
              />
              <SummaryCard
                icon={<TrendingUp size={19} />}
                label="متوسط الدرجات"
                value={percentage(data.summary.averageGradePercent)}
                tone={progressColor(data.summary.averageGradePercent)}
                hint="للتسليمات التي تم تصحيحها"
              />
              <SummaryCard
                icon={<ClipboardList size={19} />}
                label="معدل تسليم الواجبات والكويزات"
                value={percentage(data.summary.assignmentSubmissionRate)}
                tone="#fbbf24"
                hint={`${data.summary.assignmentCount} واجب / كويز منشور`}
              />
              <SummaryCard
                icon={<Video size={19} />}
                label="معدل إكمال مشاهدة الحصص"
                value={percentage(data.summary.videoCompletionRate)}
                tone="#34d399"
                hint={`متوسط المشاهدة: ${percentage(avgWatchPct)} · ${data.summary.videoCount} حصة، و${data.summary.documentCount} ملف`}
              />
            </section>

            <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                }}>
                  <div>
                    <h2 style={{ fontSize: 17, margin: 0 }}>أداء كل طالب بالتفصيل</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '5px 0 0' }}>
                      اضغط على «عرض» أمام أي طالب لمشاهدة تفاصيل كل حصة (فتح / لم يفتح ونسبة المشاهدة) وكل كويز أو واجب (حل / لم يحل) وكل ملف.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 240, maxWidth: 360, flex: '1 1 240px' }}>
                    <Search size={16} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      className="form-input"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="ابحث بالاسم أو البريد أو رقم الطالب أو الهاتف"
                      aria-label="ابحث عن طالب"
                    />
                  </label>
                </div>

                {/* Quick Filter Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { id: 'ALL' as StudentFilter, label: `كل الطلاب (${data.students.length})` },
                    { id: 'INCOMPLETE_VIDEOS' as StudentFilter, label: 'لم يكملوا مشاهدة الحصص' },
                    { id: 'MISSING_ASSIGNMENTS' as StudentFilter, label: 'لديهم واجبات / كويزات لم تُحل' },
                    { id: 'PENDING_GRADING' as StudentFilter, label: 'بانتظار التصحيح' },
                    { id: 'UNOPENED_DOCS' as StudentFilter, label: 'لم يفتحوا كل الملفات' },
                  ].map(tab => {
                    const active = filter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilter(tab.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border)',
                          background: active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                          color: active ? '#818cf8' : 'var(--text-secondary)',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
                  {data.students.length === 0 ? 'لا يوجد طلاب مسجلون في هذه المجموعة.' : 'لا يوجد طالب مطابق للبحث أو الفلتر المحدد.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)' }}>
                        <th style={thStyle}>الطالب</th>
                        <th style={thStyle}>التواصل</th>
                        <th style={thStyle}>الواجبات والكويزات</th>
                        <th style={thStyle}>متوسط الدرجات</th>
                        <th style={thStyle}>الحصص (فتح / إكمال)</th>
                        <th style={thStyle}>تقدم المشاهدة</th>
                        <th style={thStyle}>الملفات</th>
                        <th style={thStyle}>آخر نشاط</th>
                        <th style={thStyle}>التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(student => {
                        const expanded = expandedStudent === student.id;
                        return (
                          <StudentRows
                            key={student.id}
                            courseName={course}
                            groupName={group}
                            student={student}
                            assignments={data.assignments || []}
                            videos={data.videos || []}
                            documents={data.documents || []}
                            expanded={expanded}
                            onToggle={() => setExpandedStudent(expanded ? null : student.id)}
                            onToggleManualUnlock={handleToggleManualUnlock}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

const thStyle: CSSProperties = {
  padding: '12px 14px',
  textAlign: 'start',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

function SummaryCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
  hint?: string;
}) {
  return (
    <article className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minHeight: 116 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: `${tone}18`, color: tone, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>{label}</div>
        <strong style={{ display: 'block', fontSize: 25, lineHeight: 1.3, marginTop: 3 }}>{value}</strong>
        {hint && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{hint}</span>}
      </div>
    </article>
  );
}

function StudentRows({
  courseName,
  groupName,
  student,
  assignments,
  videos,
  documents,
  expanded,
  onToggle,
  onToggleManualUnlock,
}: {
  courseName: string;
  groupName: string;
  student: StudentStat;
  assignments: AssignmentStat[];
  videos: VideoStat[];
  documents: DocumentStat[];
  expanded: boolean;
  onToggle: () => void;
  onToggleManualUnlock: (studentId: string, itemType: 'VIDEO' | 'ASSIGNMENT', itemId: string, unlock: boolean) => void;
}) {
  const safeAssignments = assignments || [];
  const safeVideos = videos || [];
  const safeDocuments = documents || [];
  const gradeColor = progressColor(student.averageGradePercent);
  const missingAssignmentsCount = student.unsubmittedAssignments ?? Math.max(0, safeAssignments.length - student.submittedAssignments);
  const pendingGradingCount = student.pendingGradingAssignments ?? Math.max(0, student.submittedAssignments - student.gradedAssignments);

  const openedVideosCount = useMemo(() => {
    if (typeof student.openedVideos === 'number') return student.openedVideos;
    return safeVideos.filter(v => {
      const detail = student.videoDetails?.[v.id];
      const pct = student.videoProgress?.[v.id] || 0;
      return Boolean(detail?.opened || pct > 0);
    }).length;
  }, [student, safeVideos]);

  const openedDocsCount = useMemo(() => {
    if (typeof student.openedDocumentsCount === 'number') return student.openedDocumentsCount;
    return safeDocuments.filter(d => student.documentOpens?.[d.id]).length;
  }, [student, safeDocuments]);

  return (
    <>
      <tr style={{ borderTop: '1px solid var(--border)' }}>
        <td style={tdStyle}>
          <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{student.name || '—'}</strong>
          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{student.email || '—'}</span>
          <span style={{ color: 'var(--primary-light)', fontSize: 11 }}>رقم الطالب: {student.studentId || '—'}</span>
        </td>
        <td style={{ ...tdStyle, fontSize: 12, lineHeight: 1.7 }}>
          <span style={{ display: 'block' }}>الطالب: {student.phone || '—'}</span>
          <span style={{ display: 'block', color: 'var(--text-secondary)' }}>ولي الأمر: {student.parentPhone || '—'}</span>
        </td>
        <td style={tdStyle}>
          <div style={{ fontWeight: 700 }}>
            {student.submittedAssignments} / {assignments.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {missingAssignmentsCount > 0 ? (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(251,113,133,0.14)', color: '#fb7185', fontWeight: 700 }}>
                لم يحل: {missingAssignmentsCount}
              </span>
            ) : assignments.length > 0 ? (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(52,211,153,0.14)', color: '#34d399', fontWeight: 700 }}>
                حل الكل ✓
              </span>
            ) : null}
            {pendingGradingCount > 0 && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(251,191,36,0.14)', color: '#fbbf24', fontWeight: 700 }}>
                بانتظار التصحيح: {pendingGradingCount}
              </span>
            )}
            {(student.totalExamViolations ?? 0) > 0 && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.18)', color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <ShieldAlert size={10} /> مخالفات امتحان: {student.totalExamViolations}
              </span>
            )}
          </div>
        </td>
        <td style={{ ...tdStyle, color: gradeColor, fontWeight: 700 }}>{percentage(student.averageGradePercent)}</td>
        <td style={tdStyle}>
          <div style={{ fontWeight: 700 }}>
            {student.completedVideos} / {videos.length} مكتمل
          </div>
          <div style={{ fontSize: 11, color: openedVideosCount < videos.length ? '#fbbf24' : '#34d399', marginTop: 3 }}>
            فتح {openedVideosCount} من {videos.length} حصة
          </div>
        </td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div aria-label={`تقدم المشاهدة ${percentage(student.videoProgressPercent)}`} style={{ width: 92, height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${student.videoProgressPercent ?? 0}%`, height: '100%', background: progressColor(student.videoProgressPercent), borderRadius: 10 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(student.videoProgressPercent) }}>
              {percentage(student.videoProgressPercent)}
            </span>
          </div>
        </td>
        <td style={tdStyle}>
          <div style={{ fontWeight: 700, color: documents.length > 0 && openedDocsCount === documents.length ? '#34d399' : 'var(--text-primary)' }}>
            {openedDocsCount} / {documents.length}
          </div>
          {documents.length > 0 && (
            <div style={{ fontSize: 11, color: openedDocsCount < documents.length ? '#fb7185' : '#34d399', marginTop: 2 }}>
              {openedDocsCount < documents.length ? `لم يفتح ${documents.length - openedDocsCount}` : 'فتح الكل ✓'}
            </div>
          )}
        </td>
        <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 12 }}>{formatDate(student.lastActivityAt)}</td>
        <td style={tdStyle}>
          <button type="button" onClick={onToggle} className="btn btn-secondary btn-sm" aria-expanded={expanded}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'إخفاء' : 'عرض'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(255,255,255,.02)' }}>
          <td colSpan={9} style={{ padding: 20 }}>
            <div className="grid-2" style={{ gap: 20 }}>
              {/* Assignments & Quizzes Column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: 0 }}>
                    <ClipboardList size={15} style={{ color: '#fbbf24' }} /> الواجبات والكويزات (حل إيه ومحلش إيه)
                  </h3>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: '#34d399', fontWeight: 700 }}>
                      حل: {student.submittedAssignments}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(251,113,133,0.12)', color: '#fb7185', fontWeight: 700 }}>
                      لم يحل: {missingAssignmentsCount}
                    </span>
                  </div>
                </div>
                {safeAssignments.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {safeAssignments.map(assignment => {
                      const detail = student.assignmentDetails?.[assignment.id];
                      const hasKey = student.assignmentGrades ? Object.prototype.hasOwnProperty.call(student.assignmentGrades, assignment.id) : false;
                      const submitted = detail ? detail.submitted : hasKey;
                      const grade = detail ? detail.grade : (student.assignmentGrades?.[assignment.id] ?? null);
                      const isManuallyUnlocked = Boolean(detail?.isManuallyUnlocked);
                      return (
                        <div key={assignment.id} style={detailRowStyle}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              {assignment.type === 'QUIZ' ? <ClipboardList size={13} style={{ color: '#818cf8', flexShrink: 0 }} /> : <BookOpen size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />}
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: assignment.type === 'QUIZ' ? 'rgba(99,102,241,0.14)' : 'rgba(245,158,11,0.14)', color: assignment.type === 'QUIZ' ? '#818cf8' : '#fbbf24', fontWeight: 700 }}>
                                {assignment.type === 'QUIZ' ? 'كويز' : 'واجب'}
                              </span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {assignment.title}
                              </span>
                              {isManuallyUnlocked && (
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.18)', color: '#4ade80', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Unlock size={10} /> مفتوح يدوياً
                                </span>
                              )}
                              {(detail?.proctoringViolations ?? 0) > 0 && (
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.16)', color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <ShieldAlert size={10} /> {detail?.proctoringViolations} مخالفة خروج
                                </span>
                              )}
                            </div>
                            {(assignment.chapterName || assignment.lessonName || detail?.submittedAt) && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {(assignment.chapterName || assignment.lessonName) && (
                                  <span>{[assignment.chapterName, assignment.lessonName].filter(Boolean).join(' · ')}</span>
                                )}
                                {detail?.submittedAt && (
                                  <span>تاريخ الحل: {formatDate(detail.submittedAt)}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => onToggleManualUnlock(student.id, 'ASSIGNMENT', assignment.id, !isManuallyUnlocked)}
                              className="btn btn-ghost btn-sm"
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isManuallyUnlocked ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                                color: isManuallyUnlocked ? '#4ade80' : 'var(--text-muted)',
                                border: '1px solid ' + (isManuallyUnlocked ? 'rgba(34,197,94,0.3)' : 'var(--border)'),
                                cursor: 'pointer',
                              }}
                              title={isManuallyUnlocked ? 'مفتوح يدوياً بتجاوز الشروط - اضغط لإعادة تطبيق الشروط' : 'فتح وتجاوز أي شروط لهذا الطالب'}
                            >
                              {isManuallyUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
                              <span>{isManuallyUnlocked ? 'مفتوح يدوياً' : 'تجاوز الشروط وفتح'}</span>
                            </button>
                            {!submitted ? (
                              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fb7185', whiteSpace: 'nowrap', fontSize: 12 }}>
                                <XCircle size={13} /> لم يسلّم
                              </strong>
                            ) : grade === null || grade === undefined ? (
                              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fbbf24', whiteSpace: 'nowrap', fontSize: 12 }}>
                                <Clock3 size={13} /> بانتظار التصحيح
                              </strong>
                            ) : (
                              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34d399', whiteSpace: 'nowrap', fontSize: 12 }}>
                                <CheckCircle2 size={13} /> {grade} / {assignment.maxGrade}
                              </strong>
                            )}
                            <Link
                              href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/submissions/${encodeURIComponent(assignment.id)}`}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '3px 7px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="عرض إجابة الطالب أو تصحيحها"
                            >
                              <span>الإجابة</span>
                              <ExternalLink size={11} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا توجد واجبات أو كويزات منشورة.</p>}
              </div>

              {/* Videos & Documents Column */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: 0 }}>
                    <Video size={15} style={{ color: '#34d399' }} /> مشاهدة الحصص (فتح إيه ونسبة المشاهدة)
                  </h3>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: '#34d399', fontWeight: 700 }}>
                      فتح: {openedVideosCount} / {safeVideos.length}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(251,113,133,0.12)', color: '#fb7185', fontWeight: 700 }}>
                      لم يفتح: {Math.max(0, safeVideos.length - openedVideosCount)}
                    </span>
                  </div>
                </div>
                {safeVideos.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {safeVideos.map(video => {
                      const detail = student.videoDetails?.[video.id];
                      const watched = detail?.watchedPercent ?? student.videoProgress?.[video.id] ?? 0;
                      const opened = detail ? detail.opened : watched > 0;
                      const watchedSec = detail?.watchedSeconds ?? 0;
                      const durationSec = detail?.durationSeconds ?? 0;
                      const totalCp = detail?.totalCheckpoints ?? video.checkpointCount ?? 0;
                      const solvedCp = detail?.solvedCheckpoints ?? 0;
                      const isManuallyUnlocked = Boolean(detail?.isManuallyUnlocked);

                      return (
                        <div key={video.id} style={detailRowStyle}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {video.title}
                              </span>
                              {isManuallyUnlocked && (
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.18)', color: '#4ade80', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Unlock size={10} /> مفتوح يدوياً
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '1px 7px',
                                  borderRadius: 99,
                                  fontWeight: 700,
                                  background: watched >= 90
                                    ? 'rgba(52,211,153,0.15)'
                                    : opened
                                    ? 'rgba(56,189,248,0.15)'
                                    : 'rgba(251,113,133,0.15)',
                                  color: watched >= 90
                                    ? '#34d399'
                                    : opened
                                    ? '#38bdf8'
                                    : '#fb7185',
                                }}
                              >
                                {watched >= 90 ? 'أكمل الحصة ✓' : opened ? 'فتح الحصة' : 'لم يفتح الحصة'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {(video.chapterName || video.lessonName) && (
                                <span>{[video.chapterName, video.lessonName].filter(Boolean).join(' · ')}</span>
                              )}
                              {durationSec > 0 && (
                                <span>مدة المشاهدة: {formatDuration(watchedSec)} من {formatDuration(durationSec)}</span>
                              )}
                              {totalCp > 0 && (
                                <span style={{ color: solvedCp === totalCp ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                                  أسئلة الفيديو: حل {solvedCp} من {totalCp}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => onToggleManualUnlock(student.id, 'VIDEO', video.id, !isManuallyUnlocked)}
                              className="btn btn-ghost btn-sm"
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isManuallyUnlocked ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                                color: isManuallyUnlocked ? '#4ade80' : 'var(--text-muted)',
                                border: '1px solid ' + (isManuallyUnlocked ? 'rgba(34,197,94,0.3)' : 'var(--border)'),
                                cursor: 'pointer',
                              }}
                              title={isManuallyUnlocked ? 'مفتوح يدوياً بتجاوز الشروط - اضغط لإعادة تطبيق الشروط' : 'فتح وتجاوز أي شروط لهذا الطالب'}
                            >
                              {isManuallyUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
                              <span>{isManuallyUnlocked ? 'مفتوح يدوياً' : 'تجاوز الشروط وفتح'}</span>
                            </button>
                            <div style={{ width: 64, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${watched}%`, height: '100%', background: progressColor(watched), borderRadius: 99 }} />
                            </div>
                            <strong style={{ color: progressColor(watched), whiteSpace: 'nowrap', minWidth: 36, textAlign: 'end' }}>
                              {watched}%
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا توجد فيديوهات في هذه المجموعة.</p>}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, margin: '18px 0 10px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: 0 }}>
                    <FileText size={15} style={{ color: '#38bdf8' }} /> الملفات والمذكرات (فتح إيه ومفتحش إيه)
                  </h3>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: '#34d399', fontWeight: 700 }}>
                      فتح: {openedDocsCount} / {documents.length}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(251,113,133,0.12)', color: '#fb7185', fontWeight: 700 }}>
                      لم يفتح: {Math.max(0, documents.length - openedDocsCount)}
                    </span>
                  </div>
                </div>
                {documents.length ? (
                  <div style={{ display: 'grid', gap: 7 }}>
                    {documents.map(document => {
                      const opened = student.documentOpens[document.id] || false;
                      return (
                        <div key={document.id} style={detailRowStyle}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                              {document.title}
                            </span>
                            {(document.chapterName || document.lessonName) && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {[document.chapterName, document.lessonName].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                          <strong style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: opened ? '#34d399' : '#fb7185',
                            whiteSpace: 'nowrap',
                          }}>
                            {opened ? <><Eye size={13} /> تم فتحه</> : <><XCircle size={13} /> لم يفتح</>}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا توجد ملفات في هذه المجموعة.</p>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: 12 }}>
                <Clock3 size={14} /> آخر نشاط: {formatDate(student.lastActivityAt)}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const tdStyle: CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  verticalAlign: 'middle',
};

const detailRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 12px',
  background: 'rgba(255,255,255,.025)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-secondary)',
  fontSize: 12,
};
