'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { appointmentsApi, assignmentsApi, questionsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Layers3,
  MessageSquareText,
  Users,
} from 'lucide-react';

type CourseGroup = {
  courseName: string;
  groupName: string;
  teacherName?: string | null;
  studentCount: number;
  schedule?: string | null;
};

type CourseOverview = {
  name: string;
  groups: CourseGroup[];
};

const COURSE_COLORS: Record<string, string> = {
  فيزيا: '#45c7e8',
  رياضه: '#35c99a',
  احصاء: '#f4b942',
  عربي: '#fb7185',
  برمجه: '#a78bfa',
};

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const isTeamMember = user?.role === 'team_member';
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<number | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<number | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [activityErrors, setActivityErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      try {
        const courseResult = await assignmentsApi.myCourses();
        if (!active) return;
        const courseNames: string[] = Array.isArray(courseResult.data) ? courseResult.data : [];
        const groupResults = await Promise.allSettled(
          courseNames.map(name => assignmentsApi.groupsDetailed(name)),
        );
        if (!active) return;

        const loadedCourses = courseNames.map((name, index) => ({
          name,
          groups: groupResults[index].status === 'fulfilled'
            ? (Array.isArray(groupResults[index].value.data) ? groupResults[index].value.data : [])
            : [],
        }));
        setCourses(loadedCourses);
        if (groupResults.some(result => result.status === 'rejected')) {
          setCourseError('Some group details could not be loaded. Open the course to try again.');
        } else {
          setCourseError('');
        }
      } catch {
        if (!active) return;
        setCourseError('Could not load your courses. Please refresh to try again.');
        setCourses([]);
      } finally {
        if (active) setLoadingCourses(false);
      }
    };

    const loadQuestions = async () => {
      try {
        const result = await questionsApi.all({ page: 1, limit: 1, status: 'pending' });
        if (active) setPendingQuestions(Number(result.data?.total ?? 0));
      } catch {
        if (!active) return;
        setPendingQuestions(null);
        setActivityErrors(current => [...current, 'Question activity is temporarily unavailable.']);
      }
    };

    const loadAppointments = async () => {
      if (isTeamMember) {
        setPendingAppointments(null);
        return;
      }
      try {
        const result = await appointmentsApi.teacherList();
        if (!active) return;
        const appointments = Array.isArray(result.data) ? result.data : [];
        setPendingAppointments(appointments.filter((item: { status?: string }) => item.status === 'PENDING').length);
      } catch {
        if (!active) return;
        setPendingAppointments(null);
        setActivityErrors(current => [...current, 'Appointment activity is temporarily unavailable.']);
      }
    };

    setActivityErrors([]);
    void loadCourses();
    void loadQuestions();
    void loadAppointments();

    return () => {
      active = false;
    };
  }, [isTeamMember]);

  const groups = useMemo(() => courses.flatMap(course => course.groups), [courses]);
  const studentCount = useMemo(
    () => groups.reduce((total, group) => total + (Number(group.studentCount) || 0), 0),
    [groups],
  );

  return (
    <AppShell>
      <main style={{ maxWidth: 1360, margin: '0 auto', paddingBottom: 48 }}>
        <section
          aria-labelledby="teacher-dashboard-title"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(24px, 4vw, 42px)',
            marginBottom: 24,
            borderRadius: 22,
            border: '1px solid rgba(91, 194, 226, .18)',
            background: 'radial-gradient(ellipse at 90% 0%, rgba(42, 173, 207, .16), transparent 42%), linear-gradient(135deg, rgba(13, 37, 54, .98), rgba(7, 20, 33, .98))',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
            <div style={{ color: '#68d4e9', fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              FIXION · TEACHING WORKSPACE
            </div>
            <h1 id="teacher-dashboard-title" style={{ margin: 0, color: '#f2f8fb', fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.12, letterSpacing: '-.04em' }}>
              Welcome back, {user?.name || 'Teacher'}
            </h1>
            <p style={{ maxWidth: 620, color: '#9ab1bf', lineHeight: 1.7, margin: '14px 0 22px', fontSize: 14 }}>
              Manage your courses, support your students, review their progress, and keep teaching moving from one place.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link href="/teacher/courses" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} aria-hidden="true" /> Explore my courses <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              {!isTeamMember && (
                <Link href="/teacher/appointments" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={16} aria-hidden="true" /> Manage appointments
                </Link>
              )}
            </div>
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', insetInlineEnd: 38, top: '50%', transform: 'translateY(-50%)', width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(104, 212, 233, .13)', display: 'grid', placeItems: 'center', color: 'rgba(104, 212, 233, .5)' }}>
            <div style={{ width: 128, height: 128, borderRadius: '50%', border: '1px solid rgba(104, 212, 233, .17)', display: 'grid', placeItems: 'center' }}>
              <GraduationCap size={58} strokeWidth={1.2} />
            </div>
          </div>
        </section>

        <section
          aria-label="Teaching overview"
          className="grid-4"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${isTeamMember ? 220 : 200}px, 1fr))`, marginBottom: 30 }}
        >
          <OverviewCard
            icon={<BookOpen size={19} />}
            label="My courses"
            value={loadingCourses ? '—' : courses.length}
            detail="Subjects in your workspace"
            accent="#47c8e7"
          />
          <OverviewCard
            icon={<Layers3 size={19} />}
            label="Teaching groups"
            value={loadingCourses ? '—' : groups.length}
            detail="Groups you can access"
            accent="#a78bfa"
          />
          <OverviewCard
            icon={<Users size={19} />}
            label="Enrolled students"
            value={loadingCourses ? '—' : studentCount}
            detail="Across your assigned groups"
            accent="#36c99a"
          />
          {!isTeamMember && (
            <OverviewCard
              icon={<CalendarDays size={19} />}
              label="Appointment requests"
              value={pendingAppointments === null ? '—' : pendingAppointments}
              detail="Waiting for your response"
              accent="#f4b942"
            />
          )}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 18, marginBottom: 32 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Your teaching groups</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Open a group to manage lessons, videos, homework, quizzes, and student progress.</p>
              </div>
              <BookOpen size={18} style={{ color: '#68d4e9', flexShrink: 0 }} aria-hidden="true" />
            </div>
            {loadingCourses ? (
              <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: 120 }}><span className="spinner" /></div>
            ) : courseError && courses.length === 0 ? (
              <div role="alert" style={{ color: 'var(--danger, #ef6a6a)', fontSize: 13 }}>{courseError}</div>
            ) : groups.length === 0 ? (
              <div style={{ padding: '22px 16px', borderRadius: 14, textAlign: 'center', background: 'rgba(255,255,255,.025)', border: '1px dashed var(--border)' }}>
                <GraduationCap size={26} style={{ color: 'var(--text-muted)', marginBottom: 8 }} aria-hidden="true" />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {isTeamMember ? 'No teaching groups are available for your assigned subjects yet.' : 'No teaching groups are assigned to your account yet.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {courses.flatMap(course => course.groups.map(group => {
                  const accent = COURSE_COLORS[course.name] || '#47c8e7';
                  const href = `/teacher/courses/${encodeURIComponent(course.name)}/${encodeURIComponent(group.groupName)}`;
                  return (
                    <Link
                      key={`${course.name}-${group.groupName}`}
                      href={href}
                      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', borderRadius: 13, border: '1px solid var(--border)', background: 'rgba(255,255,255,.025)', textDecoration: 'none', color: 'inherit', transition: 'border-color .16s ease, background .16s ease' }}
                    >
                      <span style={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 12, color: accent, background: `${accent}18` }}>
                        <GraduationCap size={19} aria-hidden="true" />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13 }}>{course.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>·</span> {group.groupName}</strong>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                          {group.studentCount} students{group.schedule ? ` · ${group.schedule}` : ''}
                        </span>
                      </span>
                      <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
                    </Link>
                  );
                }))}
              </div>
            )}
            {courseError && courses.length > 0 && <p role="status" style={{ margin: '12px 0 0', color: 'var(--warning, #f4b942)', fontSize: 12 }}>{courseError}</p>}
            <Link href="/teacher/courses" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, paddingInlineStart: 0 }}>
              Browse all courses <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Student support & follow-up</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Keep up with questions and requests from your students.</p>
              </div>
              <MessageSquareText size={18} style={{ color: '#a78bfa', flexShrink: 0 }} aria-hidden="true" />
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {!isTeamMember && (
                <ActivityLink
                  href="/teacher/appointments"
                  icon={<CalendarDays size={18} />}
                  title="Appointment requests"
                  description="Review meeting requests and respond to students."
                  count={pendingAppointments}
                  accent="#f4b942"
                />
              )}
              <ActivityLink
                href="/teacher/questions"
                icon={<HelpCircle size={18} />}
                title="Student questions"
                description="Answer questions related to your assigned subjects."
                count={pendingQuestions}
                accent="#a78bfa"
              />
              <ActivityLink
                href="/teacher/courses"
                icon={<ClipboardList size={18} />}
                title="Assignments & quizzes"
                description="Open a group to review submissions, grade work, or check progress."
                count={null}
                accent="#36c99a"
              />
            </div>
            {activityErrors.map(error => (
              <p key={error} role="status" style={{ margin: '12px 0 0', color: 'var(--warning, #f4b942)', fontSize: 12 }}>{error}</p>
            ))}
          </div>
        </section>

        <section aria-labelledby="focus-heading">
          <div className="page-header" style={{ marginBottom: 14 }}>
            <div>
              <h2 id="focus-heading" style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Your day at a glance</h2>
              <p className="page-subtitle" style={{ marginTop: 5 }}>Questions are one part of the workspace—your courses and student follow-up are here too.</p>
            </div>
            <Link href="/teacher/questions" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <HelpCircle size={14} aria-hidden="true" /> Open question center
            </Link>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 17 }}>
            <span style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 11, background: 'rgba(54,201,154,.12)', color: '#36c99a', flexShrink: 0 }}>
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }}>
                {pendingQuestions === 0 && (pendingAppointments === 0 || isTeamMember)
                  ? 'You’re all caught up'
                  : pendingQuestions === null && pendingAppointments === null
                    ? 'Your teaching workspace is ready'
                    : 'Your next steps are ready'}
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {pendingQuestions !== null || pendingAppointments !== null
                  ? `${pendingQuestions ?? 0} pending questions${!isTeamMember ? ` · ${pendingAppointments ?? 0} appointment requests` : ''}. Open a group to check assignments and student progress.`
                  : 'Open a group to check assignments, quizzes, and student progress.'}
              </span>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  accent: string;
}) {
  return (
    <article className="stat-card" style={{ borderBottom: `2px solid ${accent}70` }}>
      <span className="stat-icon" style={{ color: accent, background: `${accent}18` }}>{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label} · {detail}</span>
    </article>
  );
}

function ActivityLink({
  href,
  icon,
  title,
  description,
  count,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number | null;
  accent: string;
}) {
  return (
    <Link href={href} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,.025)' }}>
      <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, color: accent, background: `${accent}18` }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }}>{title}</strong>
        <span style={{ display: 'block', fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)', marginTop: 3 }}>{description}</span>
      </span>
      {count !== null && (
        <span aria-label={`${count} pending`} style={{ minWidth: 28, height: 28, padding: '0 8px', display: 'grid', placeItems: 'center', borderRadius: 999, background: `${accent}18`, color: accent, fontSize: 12, fontWeight: 700 }}>
          {count}
        </span>
      )}
      <ArrowUpRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
    </Link>
  );
}
