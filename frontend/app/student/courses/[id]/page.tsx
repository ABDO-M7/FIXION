'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { enrollmentsApi } from '@/lib/api';
import { GraduationCap, User, Users, ArrowLeft, BookOpen, ClipboardList } from 'lucide-react';
import Link from 'next/link';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا': '#6366f1',
  'رياضه': '#10b981',
  'احصاء': '#f59e0b',
  'عربي':  '#ef4444',
  'برمجه': '#8b5cf6',
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'homework' | 'quiz'>('homework');

  useEffect(() => {
    enrollmentsApi.one(id)
      .then(r => setEnrollment(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      </AppShell>
    );
  }

  if (!enrollment) {
    return (
      <AppShell>
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h2 style={{ fontWeight: 700 }}>Course not found</h2>
          <Link href="/student/courses" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to Courses
          </Link>
        </div>
      </AppShell>
    );
  }

  const color = COURSE_COLORS[enrollment.courseName] || '#6366f1';

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Link href="/student/courses" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Courses
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <GraduationCap size={26} style={{ color }} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{enrollment.courseName}</h1>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                {enrollment.teacherName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} /> {enrollment.teacherName}
                  </span>
                )}
                {enrollment.groupName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {enrollment.groupName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button
          className={`tab-btn ${tab === 'homework' ? 'active' : ''}`}
          onClick={() => setTab('homework')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <BookOpen size={15} /> Homework
        </button>
        <button
          className={`tab-btn ${tab === 'quiz' ? 'active' : ''}`}
          onClick={() => setTab('quiz')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ClipboardList size={15} /> Quiz
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'homework' && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No homework yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Your teacher hasn't posted any homework for this course yet.
          </p>
        </div>
      )}

      {tab === 'quiz' && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No quizzes yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Your teacher hasn't posted any quizzes for this course yet.
          </p>
        </div>
      )}
    </AppShell>
  );
}
