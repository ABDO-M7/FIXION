'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { videosApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Flame,
  HelpCircle,
  RefreshCw,
  Search,
  Users,
  Video,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type HeatmapBucket = {
  index: number;
  startSeconds: number;
  endSeconds: number;
  label: string;
  rangeLabel: string;
  count: number;
  intensity: number;
  viewersCount: number;
  retentionPercent: number;
  students: Array<{
    studentId: string;
    studentName: string;
    note: string | null;
    markId: string;
    exactRange: string;
  }>;
};

type ConfusionMarkDetail = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  startSeconds: number;
  endSeconds: number;
  rangeLabel: string;
  note: string | null;
  resolved: boolean;
  createdAt: string;
};

type AssignmentAnalyticsItem = {
  id: string;
  title: string;
  type: 'QUIZ' | 'HOMEWORK';
  chapterName?: string | null;
  lessonName?: string | null;
  isSameLesson: boolean;
  maxGrade: number;
  dueDate?: string | null;
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
  gradedCount: number;
  submissionRate: number;
  averageScore: number;
  averageScorePercent: number;
  highestScore: number;
  lowestScore: number;
  passCount: number;
  passRate: number;
};

type StudentRow = {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  opened: boolean;
  watchedSeconds: number;
  watchedMinutes: number;
  watchedPercent: number;
  completed: boolean;
  lastUpdatedAt: string | null;
  checkpointsSolved: number;
  checkpointsTotal: number;
  confusionCount: number;
  confusionRanges: Array<{
    id: string;
    rangeLabel: string;
    note: string | null;
  }>;
  assignments: Array<{
    assignmentId: string;
    title: string;
    type: 'QUIZ' | 'HOMEWORK';
    submitted: boolean;
    status: string;
    score: number | null;
    maxGrade: number;
  }>;
};

function heatColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(16, 185, 129, 0.18)';
  if (intensity < 0.35) return 'rgba(250, 204, 21, 0.55)';
  if (intensity < 0.7) return 'rgba(249, 115, 22, 0.78)';
  return 'rgba(239, 68, 68, 0.95)';
}

export default function VideoAnalyticsPage() {
  const params = useParams() as { courseName: string; groupName: string; videoId: string };
  const courseName = decodeURIComponent(params.courseName || '');
  const groupName = decodeURIComponent(params.groupName || '');
  const videoId = params.videoId;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'CONFUSED' | 'UNWATCHED' | 'COMPLETED'>('ALL');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await videosApi.analytics(videoId);
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر تحميل إحصائيات الحصة والفيديو');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const buckets: HeatmapBucket[] = data?.confusionAnalytics?.heatmapBuckets || [];
  const marks: ConfusionMarkDetail[] = data?.confusionAnalytics?.marks || [];
  const peakSegment = data?.confusionAnalytics?.peakSegment || null;
  const watchSummary = data?.watchSummary || {};
  const checkpointAnalytics = data?.checkpointAnalytics || { totalCheckpoints: 0, items: [] };
  const lessonAssignments: AssignmentAnalyticsItem[] = data?.lessonAssignmentsAnalytics || [];
  const studentsTable: StudentRow[] = data?.studentsTable || [];

  const selectedBucket = useMemo(
    () => (selectedBucketIndex !== null ? buckets.find(b => b.index === selectedBucketIndex) || null : null),
    [buckets, selectedBucketIndex],
  );

  const displayedMarks = useMemo(() => {
    if (!selectedBucket) return marks;
    return marks.filter(
      m => m.startSeconds < selectedBucket.endSeconds && m.endSeconds > selectedBucket.startSeconds,
    );
  }, [marks, selectedBucket]);

  const filteredStudents = useMemo(() => {
    return studentsTable.filter(st => {
      if (studentFilter === 'CONFUSED' && st.confusionCount === 0) return false;
      if (studentFilter === 'UNWATCHED' && st.watchedPercent > 0) return false;
      if (studentFilter === 'COMPLETED' && !st.completed) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.trim().toLowerCase();
        return (
          st.studentName?.toLowerCase().includes(q) ||
          st.studentId?.toLowerCase().includes(q) ||
          st.studentEmail?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [studentsTable, studentFilter, studentSearch]);

  const backHref = `/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}`;

  return (
    <AppShell>
      <div className="page-container" style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 18px 64px' }}>
        {/* Header */}
        <div
          className="card"
          style={{
            padding: '20px 24px',
            marginBottom: 22,
            background: 'linear-gradient(135deg, rgba(30,41,59,.92), rgba(15,23,42,.96))',
            border: '1px solid rgba(99,102,241,.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href={backHref} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={15} />
              العودة للكورس
            </Link>
            <img
              src="/brand/fixion-mascot-avatar.png"
              alt="Fixion AI Companion"
              style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(99,102,241,.45)' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: 'rgba(99,102,241,.2)', color: '#a5b4fc', fontWeight: 700 }}>
                  {courseName} · {groupName}
                </span>
                {data?.video?.chapterName && (
                  <span className="badge" style={{ background: 'rgba(16,185,129,.15)', color: '#6ee7b7' }}>
                    {data.video.chapterName} / {data.video.lessonName}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 21, fontWeight: 800, margin: '6px 0 0', color: '#fff' }}>
                📊 إحصائيات الحصة وخريطة الفهم الحرارية (Heatmap): {data?.video?.title || '...'}
              </h1>
            </div>
          </div>

          <button onClick={loadAnalytics} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            تحديث الإحصائيات
          </button>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <span className="spinner" />
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>جاري تحليل بيانات المشاهدة وخريطة الأجزاء غير المفهومة...</p>
          </div>
        ) : !data ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p>تعذر العثور على بيانات هذا الفيديو.</p>
          </div>
        ) : (
          <>
            {/* Top Summary KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
                marginBottom: 22,
              }}
            >
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                  <span>إجمالي طلاب المجموعة</span>
                  <Users size={17} style={{ color: '#818cf8' }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{watchSummary.totalStudents ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  فتح الحصة: <strong>{watchSummary.openedCount ?? 0}</strong> طالب ({watchSummary.neverOpenedCount ?? 0} لم يفتحها)
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                  <span>شاهدوا الفيديو فعلياً</span>
                  <Eye size={17} style={{ color: '#38bdf8' }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#38bdf8' }}>
                  {watchSummary.watchedCount ?? 0}{' '}
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    / {watchSummary.totalStudents ?? 0}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  أتموا 85%+: <strong style={{ color: '#34d399' }}>{watchSummary.completedCount ?? 0}</strong> ({watchSummary.completionRate ?? 0}%)
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                  <span>متوسط نسبة المشاهدة</span>
                  <Video size={17} style={{ color: '#10b981' }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#34d399' }}>
                  {watchSummary.averageWatchedPercent ?? 0}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  متوسط وقت المشاهدة: <strong>{watchSummary.averageWatchedMinutes ?? 0} دقيقة</strong>
                </div>
              </div>

              <div className="card" style={{ padding: 18, border: '1px solid rgba(245,158,11,.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>
                  <span>بلاغات &ldquo;مش فاهم الجزئية دي&rdquo;</span>
                  <HelpCircle size={17} style={{ color: '#fbbf24' }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#fbbf24' }}>
                  {data.confusionAnalytics?.totalMarks ?? 0}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  من <strong>{data.confusionAnalytics?.uniqueConfusedStudents ?? 0}</strong> طالب مختلف
                </div>
              </div>

              <div className="card" style={{ padding: 18, border: peakSegment ? '1px solid rgba(239,68,68,.45)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f87171', fontSize: 12, fontWeight: 700 }}>
                  <span>أكثر جزئية غير مفهومة (Peak)</span>
                  <Flame size={17} style={{ color: '#f87171' }} />
                </div>
                {peakSegment ? (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: '#f87171' }}>
                      {peakSegment.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      <strong>{peakSegment.count} طلاب</strong> طلبوا إعادة شرح هذه الجزئية
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 10, color: '#34d399' }}>لا توجد أجزاء معقدة</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>لم يسجل الطلاب أي جزئية غير مفهومة بعد</div>
                  </>
                )}
              </div>
            </div>

            {/* Confusion Heatmap & Retention Timeline Graph */}
            <div className="card" style={{ padding: 22, marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Flame size={19} style={{ color: '#f97316' }} />
                    خريطة الفهم الحرارية (Confusion Heatmap) ومنحنى المشاهدة لكل دقيقة
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    اضغط على أي مربع زمني في الـ Heatmap أو العمود البرتقالي لمعرفة الطلاب الذين لم يفهموا هذه الجزئية وملاحظاتهم بالتفصيل.
                  </p>
                </div>

                {selectedBucket && (
                  <button
                    type="button"
                    onClick={() => setSelectedBucketIndex(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    عرض كل الدقائق ({marks.length} بلاغ)
                  </button>
                )}
              </div>

              {/* Visual Color-Coded Heatmap Bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>بداية الفيديو (00:00)</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(16,185,129,.25)', display: 'inline-block' }} /> واضح
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(250,204,21,.65)', display: 'inline-block' }} /> صعوبة متوسطة
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(239,68,68,.95)', display: 'inline-block' }} /> أكثر جزئية غير مفهومة
                    </span>
                  </span>
                  <span>نهاية الفيديو ({buckets[buckets.length - 1]?.rangeLabel?.split(' - ')[1] || ''})</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))`,
                    gap: 3,
                    padding: 6,
                    borderRadius: 12,
                    background: 'rgba(15,23,42,.8)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {buckets.map(bucket => {
                    const isSelected = selectedBucketIndex === bucket.index;
                    return (
                      <button
                        key={bucket.index}
                        type="button"
                        onClick={() => setSelectedBucketIndex(isSelected ? null : bucket.index)}
                        title={`${bucket.rangeLabel} — غير فاهمين: ${bucket.count} طلاب | شاهدها: ${bucket.viewersCount} طالب`}
                        style={{
                          height: 36,
                          border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,.08)',
                          borderRadius: 6,
                          background: heatColor(bucket.intensity),
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 800,
                          transition: 'transform .15s ease',
                          transform: isSelected ? 'scaleY(1.12)' : undefined,
                        }}
                      >
                        {bucket.count > 0 ? bucket.count : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recharts Timeline Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={buckets}
                    onClick={(state: any) => {
                      if (state && typeof state.activeTooltipIndex === 'number') {
                        const idx = state.activeTooltipIndex;
                        setSelectedBucketIndex(prev => (prev === idx ? null : idx));
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(148,163,184,.25)',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 12,
                      }}
                      formatter={(value: any, name?: any) => {
                        if (name === 'count') return [`${value} طلاب`, 'مش فاهمين الجزئية دي'];
                        if (name === 'viewersCount') return [`${value} طالب`, 'شاهدوا هذه الدقيقة'];
                        return [value, String(name || '')];
                      }}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.rangeLabel || _label}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === 'count' ? '🔥 عدد الطلاب غير الفاهمين للجزئية' : '👁️ عدد الطلاب المشاهدين لهذه الدقيقة'
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="viewersCount"
                      stroke="#38bdf8"
                      fill="rgba(56,189,248,0.16)"
                      strokeWidth={2}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Confused Students List for Selected Segment or All Segments */}
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#fbbf24' }}>
                    {selectedBucket
                      ? `📌 الطلاب الذين لم يفهموا الجزئية (${selectedBucket.rangeLabel}) — ${displayedMarks.length} بلاغ`
                      : `📋 جميع الأجزاء التي حددها الطلاب كغير مفهومة (${marks.length})`}
                  </h3>
                </div>

                {displayedMarks.length === 0 ? (
                  <div style={{ padding: 18, borderRadius: 10, background: 'rgba(16,185,129,.07)', color: '#6ee7b7', fontSize: 13 }}>
                    لا توجد بلاغات &ldquo;مش فاهم الجزئية دي&rdquo; في هذه الفترة الزمنية.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
                    {displayedMarks.map(mark => (
                      <div
                        key={mark.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: 'rgba(245,158,11,.08)',
                          border: '1px solid rgba(245,158,11,.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <strong style={{ fontSize: 14, color: '#fff' }}>{mark.studentName}</strong>
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(239,68,68,.2)',
                              color: '#fca5a5',
                              fontWeight: 800,
                              fontSize: 11,
                            }}
                          >
                            من {mark.rangeLabel.replace(' - ', ' إلى ')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>كود الطالب: #{mark.studentId}</div>
                        {mark.note ? (
                          <div style={{ fontSize: 13, color: '#fde68a', background: 'rgba(0,0,0,.25)', padding: '7px 10px', borderRadius: 8 }}>
                            💬 &ldquo;{mark.note}&rdquo;
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            بدون ملاحظة إضافية (طلب إعادة شرح هذه الجزئية)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Watch Distribution & Checkpoints Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 18, marginBottom: 22 }}>
              {/* Watch Distribution */}
              <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={18} style={{ color: '#38bdf8' }} />
                  توزيع نسب مشاهدة الطلاب للفيديو
                </h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {(watchSummary.watchDistribution || []).map((item: any, idx: number) => {
                    const total = Math.max(1, Number(watchSummary.totalStudents) || 1);
                    const pct = Math.round(((Number(item.count) || 0) / total) * 100);
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                          <span>{item.bucket}</span>
                          <strong>
                            {item.count} طالب ({pct}%)
                          </strong>
                        </div>
                        <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: idx === 4 ? '#10b981' : idx === 0 ? '#ef4444' : '#6366f1',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Checkpoints Stats */}
              <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                  إحصائيات أسئلة التوقف داخل الفيديو (Checkpoints: {checkpointAnalytics.totalCheckpoints})
                </h2>
                {checkpointAnalytics.items?.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>لا توجد أسئلة تفاعلية مضافة داخل هذا الفيديو.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {checkpointAnalytics.items.map((cp: any) => (
                      <div
                        key={cp.id}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,.03)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: 13 }}>{cp.prompt}</strong>
                          <span className="badge" style={{ background: 'rgba(56,189,248,.15)', color: '#38bdf8', fontSize: 11 }}>
                            الدقيقة {cp.timestampLabel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span>أجاب صح: <strong style={{ color: '#34d399' }}>{cp.solvedCount}</strong></span>
                          <span>نسبة الاجتياز: <strong>{cp.passRate}%</strong></span>
                          <span>متوسط المحاولات: <strong>{cp.avgAttempts}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quizzes & Homework Analytics for Lesson */}
            <div className="card" style={{ padding: 22, marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={19} style={{ color: '#a855f7' }} />
                إحصائيات الكويزات والواجبات المرتبطة بالحصة والمجموعة
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                ملخص أداء الطلاب في الكويزات والواجبات الخاصة بهذا الدرس أو المجموعة، مع نسب التسليم ومتوسط الدرجات.
              </p>

              {lessonAssignments.length === 0 ? (
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,.03)', color: 'var(--text-secondary)', fontSize: 13 }}>
                  لا توجد كويزات أو واجبات مضافة لهذه المجموعة بعد.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
                  {lessonAssignments.map(a => (
                    <div
                      key={a.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: a.isSameLesson ? 'rgba(99,102,241,.09)' : 'rgba(255,255,255,.03)',
                        border: a.isSameLesson ? '1px solid rgba(99,102,241,.38)' : '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                          <span
                            className="badge"
                            style={{
                              background: a.type === 'QUIZ' ? 'rgba(168,85,247,.2)' : 'rgba(59,130,246,.2)',
                              color: a.type === 'QUIZ' ? '#d8b4fe' : '#93c5fd',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            {a.type === 'QUIZ' ? '⚡ كويز' : '📘 واجب'}
                          </span>
                          {a.isSameLesson && (
                            <span className="badge" style={{ background: 'rgba(16,185,129,.18)', color: '#6ee7b7', fontSize: 11 }}>
                              مرتبط بنفس الدرس
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>{a.title}</h3>
                        {a.lessonName && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                            {a.chapterName} · {a.lessonName}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                          <div style={{ background: 'rgba(0,0,0,.22)', padding: '8px 10px', borderRadius: 8 }}>
                            <div style={{ color: 'var(--text-secondary)' }}>نسبة التسليم</div>
                            <strong style={{ fontSize: 15, color: '#38bdf8' }}>
                              {a.submissionRate}% ({a.submittedCount}/{a.totalStudents})
                            </strong>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,.22)', padding: '8px 10px', borderRadius: 8 }}>
                            <div style={{ color: 'var(--text-secondary)' }}>متوسط الدرجة</div>
                            <strong style={{ fontSize: 15, color: '#34d399' }}>
                              {a.averageScore} / {a.maxGrade} ({a.averageScorePercent}%)
                            </strong>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,.22)', padding: '8px 10px', borderRadius: 8 }}>
                            <div style={{ color: 'var(--text-secondary)' }}>نسبة النجاح (50%+)</div>
                            <strong style={{ fontSize: 14 }}>{a.passRate}%</strong>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,.22)', padding: '8px 10px', borderRadius: 8 }}>
                            <div style={{ color: 'var(--text-secondary)' }}>أعلى / أقل درجة</div>
                            <strong style={{ fontSize: 14 }}>
                              {a.highestScore} / {a.lowestScore}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/submissions/${a.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        عرض تسليمات ودرجات الطلاب
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-Student Detailed Breakdown Table */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                    👨‍🎓 جدول متابعة الطلاب التفصيلي للحصة ({filteredStudents.length} طالب)
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    تفاصيل كل طالب: هل فتح الحصة، كم دقيقة شاهد، الأجزاء التي لم يفهمها، ودرجاته في الكويز والواجب.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="ابحث باسم الطالب أو الكود..."
                      className="form-input"
                      style={{ paddingRight: 30, minWidth: 210, fontSize: 13 }}
                    />
                  </div>
                  <select
                    value={studentFilter}
                    onChange={e => setStudentFilter(e.target.value as any)}
                    className="form-input"
                    style={{ width: 'auto', fontSize: 13 }}
                  >
                    <option value="ALL">كل الطلاب ({studentsTable.length})</option>
                    <option value="CONFUSED">مش فاهمين جزئية ({studentsTable.filter(s => s.confusionCount > 0).length})</option>
                    <option value="UNWATCHED">لم يشاهدوا الفيديو ({studentsTable.filter(s => s.watchedPercent === 0).length})</option>
                    <option value="COMPLETED">أتموا 85%+ ({studentsTable.filter(s => s.completed).length})</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '10px 8px' }}>الطالب</th>
                      <th style={{ padding: '10px 8px' }}>نسبة المشاهدة</th>
                      <th style={{ padding: '10px 8px' }}>دقائق المشاهدة</th>
                      <th style={{ padding: '10px 8px' }}>أسئلة الفيديو</th>
                      <th style={{ padding: '10px 8px' }}>الأجزاء غير المفهومة</th>
                      <th style={{ padding: '10px 8px' }}>الكويزات والواجبات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(st => (
                      <tr key={st.studentId} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 700 }}>{st.studentName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>#{st.studentId}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span
                            className="badge"
                            style={{
                              background: st.completed
                                ? 'rgba(16,185,129,.18)'
                                : st.watchedPercent > 0
                                ? 'rgba(56,189,248,.16)'
                                : 'rgba(239,68,68,.16)',
                              color: st.completed ? '#34d399' : st.watchedPercent > 0 ? '#38bdf8' : '#f87171',
                              fontWeight: 800,
                            }}
                          >
                            {st.watchedPercent}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {st.watchedMinutes > 0 ? `${st.watchedMinutes} دقيقة` : <span style={{ color: 'var(--text-secondary)' }}>لم يشاهد</span>}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {st.checkpointsTotal > 0 ? `${st.checkpointsSolved} / ${st.checkpointsTotal}` : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', maxWidth: 280 }}>
                          {st.confusionRanges.length === 0 ? (
                            <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {st.confusionRanges.map(r => (
                                <span
                                  key={r.id}
                                  title={r.note || ''}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    background: 'rgba(245,158,11,.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(245,158,11,.3)',
                                  }}
                                >
                                  {r.rangeLabel} {r.note ? `(${r.note})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {st.assignments.map(a => (
                              <span
                                key={a.assignmentId}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  background: a.submitted ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                                  color: a.submitted ? '#6ee7b7' : '#fca5a5',
                                }}
                              >
                                {a.title}: {a.submitted ? (a.score !== null ? `${a.score}/${a.maxGrade}` : 'تم التسليم') : 'لم يسلم'}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
