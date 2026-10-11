'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import {
  ArrowLeft, BookOpen, ClipboardList, Clock3, FileText, Search,
  TrendingUp, Users, Video, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';

type AssignmentStat = { id: string; title: string; type: 'QUIZ' | 'HOMEWORK'; maxGrade: number };
type VideoStat = { id: string; title: string };
type DocumentStat = { id: string; title: string };
type StudentStat = {
  id: string;
  name: string | null;
  email: string | null;
  studentId: string | null;
  phone: string | null;
  parentPhone: string | null;
  level: string | null;
  submittedAssignments: number;
  gradedAssignments: number;
  averageGradePercent: number | null;
  completedVideos: number;
  totalVideos: number;
  videoProgressPercent: number | null;
  lastActivityAt: string | null;
  assignmentGrades: Record<string, number | null>;
  videoProgress: Record<string, number>;
  documentOpens: Record<string, boolean>;
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
  };
  assignments: AssignmentStat[];
  videos: VideoStat[];
  documents: DocumentStat[];
  students: StudentStat[];
};

function percentage(value: number | null) {
  return value === null ? '—' : `${value}%`;
}

function progressColor(value: number | null) {
  if (value === null) return 'var(--text-muted)';
  return value >= 75 ? '#34d399' : value >= 50 ? '#fbbf24' : '#fb7185';
}

function formatDate(value: string | null) {
  if (!value) return 'لا يوجد نشاط مسجل';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function GroupStatsPage() {
  const { courseName, groupName } = useParams<{ courseName: string; groupName: string }>();
  const course = decodeURIComponent(courseName);
  const group = decodeURIComponent(groupName);
  const [data, setData] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return data?.students || [];
    return (data?.students || []).filter(student =>
      [student.name, student.email, student.studentId, student.phone, student.parentPhone]
        .some(value => value?.toLocaleLowerCase().includes(needle)),
    );
  }, [data, search]);

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
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
            <p className="page-subtitle">متابعة أداء الطلاب في الواجبات والكويزات ومشاهدة الحصص.</p>
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
                hint={`${data.summary.videoCount} حصة، و${data.summary.documentCount} ملف`}
              />
            </section>

            <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '18px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <h2 style={{ fontSize: 17, margin: 0 }}>أداء كل طالب</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '5px 0 0' }}>
                    اضغط على الطالب لعرض تفاصيل كل واجب وفيديو.
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 240, maxWidth: 340, flex: '1 1 240px' }}>
                  <Search size={16} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    className="form-input"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="ابحث بالاسم أو البريد أو رقم الطالب"
                    aria-label="ابحث عن طالب"
                  />
                </label>
              </div>

              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
                  {data.students.length === 0 ? 'لا يوجد طلاب مسجلون في هذه المجموعة.' : 'لا يوجد طالب مطابق للبحث.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)' }}>
                        <th style={thStyle}>الطالب</th>
                        <th style={thStyle}>التواصل</th>
                        <th style={thStyle}>التسليمات</th>
                        <th style={thStyle}>متوسط الدرجات</th>
                        <th style={thStyle}>الحصص المكتملة</th>
                        <th style={thStyle}>تقدم المشاهدة</th>
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
                            student={student}
                            assignments={data.assignments}
                            videos={data.videos}
                            documents={data.documents}
                            expanded={expanded}
                            onToggle={() => setExpandedStudent(expanded ? null : student.id)}
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
  student,
  assignments,
  videos,
  documents,
  expanded,
  onToggle,
}: {
  student: StudentStat;
  assignments: AssignmentStat[];
  videos: VideoStat[];
  documents: DocumentStat[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const gradeColor = progressColor(student.averageGradePercent);
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
        <td style={tdStyle}>{student.submittedAssignments} / {assignments.length}</td>
        <td style={{ ...tdStyle, color: gradeColor, fontWeight: 700 }}>{percentage(student.averageGradePercent)}</td>
        <td style={tdStyle}>{student.completedVideos} / {videos.length}</td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div aria-label={`تقدم المشاهدة ${percentage(student.videoProgressPercent)}`} style={{ width: 92, height: 7, background: 'rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${student.videoProgressPercent ?? 0}%`, height: '100%', background: progressColor(student.videoProgressPercent), borderRadius: 10 }} />
            </div>
            <span style={{ fontSize: 12 }}>{percentage(student.videoProgressPercent)}</span>
          </div>
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
          <td colSpan={8} style={{ padding: 18 }}>
            <div className="grid-2" style={{ gap: 18 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '0 0 10px' }}>
                  <ClipboardList size={15} style={{ color: '#fbbf24' }} /> الواجبات والكويزات
                </h3>
                {assignments.length ? (
                  <div style={{ display: 'grid', gap: 7 }}>
                    {assignments.map(assignment => {
                      const grade = student.assignmentGrades[assignment.id];
                      return (
                        <div key={assignment.id} style={detailRowStyle}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                            {assignment.type === 'QUIZ' ? <ClipboardList size={13} /> : <BookOpen size={13} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignment.title}</span>
                          </span>
                          <strong style={{ color: grade === undefined ? 'var(--text-muted)' : grade === null ? '#fbbf24' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {grade === undefined ? 'لم يسلّم' : grade === null ? 'بانتظار التصحيح' : `${grade} / ${assignment.maxGrade}`}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا توجد واجبات أو كويزات منشورة.</p>}
              </div>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '0 0 10px' }}>
                  <Video size={15} style={{ color: '#34d399' }} /> مشاهدة الحصص
                </h3>
                {videos.length ? (
                  <div style={{ display: 'grid', gap: 7 }}>
                    {videos.map(video => {
                      const watched = student.videoProgress[video.id] || 0;
                      return (
                        <div key={video.id} style={detailRowStyle}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</span>
                          <strong style={{ color: progressColor(watched), whiteSpace: 'nowrap' }}>{watched}%</strong>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>لا توجد فيديوهات في هذه المجموعة.</p>}
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '18px 0 10px' }}>
                  <FileText size={15} style={{ color: '#38bdf8' }} /> الملفات
                </h3>
                {documents.length ? (
                  <div style={{ display: 'grid', gap: 7 }}>
                    {documents.map(document => {
                      const opened = student.documentOpens[document.id] || false;
                      return (
                        <div key={document.id} style={detailRowStyle}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{document.title}</span>
                          <strong style={{ color: opened ? '#34d399' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {opened ? 'تم فتحه' : 'لم يفتح'}
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
  padding: '9px 11px',
  background: 'rgba(255,255,255,.025)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-secondary)',
  fontSize: 12,
};
