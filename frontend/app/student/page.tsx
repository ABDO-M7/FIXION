'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { assignmentsApi, enrollmentsApi, questionsApi, subscriptionsApi, videosApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import { BookOpen, FileText, Key, PlayCircle, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [courseProgress, setCourseProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
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
