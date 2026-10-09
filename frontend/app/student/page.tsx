'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { assignmentsApi, enrollmentsApi, questionsApi, subscriptionsApi, videosApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import { BookOpen, CheckCircle, FileText, Key, PlayCircle, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setChartsReady(true);
    Promise.all([
      questionsApi.myQuestions(1, 5),
      subscriptionsApi.status(),
      enrollmentsApi.my(),
    ]).then(async ([qRes, sRes, enrollmentsRes]) => {
      setQuestions(qRes.data.data || []);
      setSubscription(sRes.data);
      const enrollments = enrollmentsRes.data || [];
      const progress = await Promise.all(enrollments.map(async (enrollment: any) => {
        const [videosResult, assignmentsResult] = await Promise.allSettled([
          videosApi.studentList(enrollment.courseName, enrollment.groupName),
          assignmentsApi.myAssignments(enrollment.courseName, enrollment.groupName),
        ]);
        const videos = videosResult.status === 'fulfilled' ? videosResult.value.data || [] : [];
        const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value.data || [] : [];
        const completedLectures = videos.filter((video: any) =>
          video.checkpointCount > 0 && video.completedCheckpointCount >= video.checkpointCount,
        ).length;
        const submittedAssignments = assignments.filter((assignment: any) => assignment.submission).length;
        return {
          ...enrollment,
          videos,
          assignments,
          completedLectures,
          submittedAssignments,
          lectureProgress: videos.length ? Math.round((completedLectures / videos.length) * 100) : 0,
          assignmentProgress: assignments.length ? Math.round((submittedAssignments / assignments.length) * 100) : 0,
        };
      }));
      setCourseProgress(progress);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalLectures = courseProgress.reduce((total, course) => total + course.videos.length, 0);
  const completedLectures = courseProgress.reduce((total, course) => total + course.completedLectures, 0);
  const totalAssignments = courseProgress.reduce((total, course) => total + course.assignments.length, 0);
  const submittedAssignments = courseProgress.reduce((total, course) => total + course.submittedAssignments, 0);
  const completionData = [
    { name: t('dashboard.student.completed'), value: completedLectures + submittedAssignments, color: '#10b981' },
    { name: t('dashboard.student.remaining'), value: Math.max(0, totalLectures + totalAssignments - completedLectures - submittedAssignments), color: '#334155' },
  ];
  const courseChartData = courseProgress.slice(0, 6).map((course, index) => ({
    name: course.courseName.length > 12 ? `${course.courseName.slice(0, 12)}…` : course.courseName,
    progress: Math.round((course.lectureProgress + course.assignmentProgress) / 2),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const statusBadge = (status: string) => {
    if (status === 'answered') return <span className="badge badge-answered">✓ {t('dashboard.student.answered')}</span>;
    if (status === 'pending') return <span className="badge badge-pending">⏳ {t('dashboard.student.pending')}</span>;
    return <span className="badge badge-closed">{t('dashboard.student.closed')}</span>;
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('common.welcomeBack')}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">{t('dashboard.student.learningOverview')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/student/courses" className="btn btn-primary"><BookOpen size={16} /> {t('nav.courses')}</Link>
          <Link href="/student/questions/new" className="btn btn-ghost"><Plus size={16} /> {t('common.askQuestion')}</Link>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 20,
        marginBottom: 24,
      }}>
        <div className="card" style={{
          minHeight: 250,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(15,23,42,0.12) 55%, rgba(16,185,129,0.08))',
          borderColor: 'rgba(99,102,241,0.24)',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'var(--primary-light)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('dashboard.student.learningSnapshot')}
              </div>
              <h2 style={{ fontSize: 24, lineHeight: 1.2, marginTop: 8, maxWidth: 420 }}>
                {courseProgress.length ? t('dashboard.student.keepGoing') : t('dashboard.student.startLearning')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8, maxWidth: 440 }}>
                {t('dashboard.student.snapshotHint')}
              </p>
            </div>
            <div style={{ padding: 10, borderRadius: 14, background: 'rgba(99,102,241,0.18)', color: 'var(--primary-light)' }}>
              <PlayCircle size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24 }}>
            <div style={{ height: 8, flex: 1, background: 'rgba(148,163,184,0.2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${totalLectures + totalAssignments ? Math.round(((completedLectures + submittedAssignments) / (totalLectures + totalAssignments)) * 100) : 0}%`,
                height: '100%', background: 'var(--gradient-primary)', borderRadius: 99,
              }} />
            </div>
            <strong style={{ fontSize: 15 }}>
              {totalLectures + totalAssignments ? Math.round(((completedLectures + submittedAssignments) / (totalLectures + totalAssignments)) * 100) : 0}%
            </strong>
          </div>
        </div>

        <div className="card" style={{ minHeight: 250 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t('dashboard.student.overallCompletion')}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{t('dashboard.student.activitiesCompleted')}</p>
            </div>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ height: 170, position: 'relative' }}>
            {chartsReady && (
              <ResponsiveContainer width="100%" height={170} minWidth={1} minHeight={170}>
                <PieChart>
                  <Pie data={completionData} dataKey="value" innerRadius={52} outerRadius={70} paddingAngle={4} stroke="none">
                    {completionData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <strong style={{ fontSize: 24 }}>{completedLectures + submittedAssignments}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t('dashboard.student.done')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <BookOpen size={22} style={{ color: 'var(--primary-light)' }} />
          </div>
          <div className="stat-value">{courseProgress.length}</div>
          <div className="stat-label">{t('dashboard.student.myCourses')}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <PlayCircle size={22} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-value">{completedLectures}/{totalLectures}</div>
          <div className="stat-label">{t('dashboard.student.lecturesCompleted')}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <FileText size={22} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="stat-value">{submittedAssignments}/{totalAssignments}</div>
          <div className="stat-label">{t('dashboard.student.assignmentsSubmitted')}</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ background: subscription?.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
            <Key size={22} style={{ color: subscription?.isActive ? 'var(--success)' : 'var(--danger)' }} />
          </div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {subscription?.isActive ? `${subscription.daysLeft}${t('common.days')}` : t('common.none')}
          </div>
          <div className="stat-label">{t('dashboard.student.subscriptionLeft')}</div>
        </div>
      </div>

      {/* Subscription Alert */}
      {!subscription?.isActive && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>{t('dashboard.student.noSubscription')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('dashboard.student.redeemSubText')}
            </div>
          </div>
          <Link href="/student/subscription" className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', flexShrink: 0 }}>
            {t('dashboard.student.redeemCode')}
          </Link>
        </div>
      )}

      {/* Course progress */}
      {courseProgress.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t('dashboard.student.learningProgress')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('dashboard.student.progressHint')}</p>
            </div>
            <Link href="/student/courses" className="btn btn-ghost btn-sm">{t('common.viewAll')} <ArrowRight size={14} /></Link>
          </div>
          <div style={{ height: 230, marginBottom: 16 }}>
            {chartsReady && (
              <ResponsiveContainer width="100%" height={230} minWidth={1} minHeight={230}>
                <BarChart data={courseChartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value}%`, t('dashboard.student.progress')]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />
                  <Bar dataKey="progress" radius={[6, 6, 0, 0]} barSize={34}>
                    {courseChartData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {courseProgress.slice(0, 4).map(course => (
              <div key={course.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{course.courseName}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {course.completedLectures}/{course.videos.length} {t('dashboard.student.lectures')}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${course.lectureProgress}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 7, color: 'var(--text-muted)', fontSize: 11 }}>
                  <span>{course.lectureProgress}% {t('dashboard.student.lectureProgress')}</span>
                  <span>{course.submittedAssignments}/{course.assignments.length} {t('dashboard.student.assignments')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Questions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t('dashboard.student.recentQuestions')}</h2>
          <Link href="/student/questions" className="btn btn-ghost btn-sm">
            {t('common.viewAll')} <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner" /></div>
        ) : questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">{t('dashboard.student.noQuestions')}</div>
            <div className="empty-state-text">{t('dashboard.student.askFirstPrompt')}</div>
            <Link href="/student/questions/new" className="btn btn-primary" style={{ marginTop: 12 }}>
              <Plus size={15} /> {t('common.askFirstQuestion')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q) => (
              <Link key={q.id} href={`/student/questions/${q.id}`} className={`question-card ${q.status}`}>
                <div className="question-meta">
                  {statusBadge(q.status)}
                  {q.category && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      📚 {q.category.subject} › {q.category.chapter}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="question-excerpt">{q.content.length > 120 ? q.content.slice(0, 120) + '…' : q.content}</p>
                {q.answers?.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--success)' }}>
                    💬 {q.answers.length} {q.answers.length > 1 ? t('dashboard.student.answersPlural') : t('dashboard.student.answers')}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
