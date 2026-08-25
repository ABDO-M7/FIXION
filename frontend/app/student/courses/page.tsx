'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { enrollmentsApi } from '@/lib/api';
import { GraduationCap, User, Users, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا': '#6366f1',
  'رياضه': '#10b981',
  'احصاء': '#f59e0b',
  'عربي':  '#ef4444',
  'برمجه': '#8b5cf6',
};

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentsApi.my()
      .then(r => setEnrollments(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">
            {loading ? '...' : `${enrollments.length} enrolled course${enrollments.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎓</div>
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No courses yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Redeem a subscription code that includes a course to get enrolled.
          </p>
          <Link href="/student/subscription" className="btn btn-primary">
            Redeem a Code
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {enrollments.map((enrollment: any) => {
            const color = COURSE_COLORS[enrollment.courseName] || '#6366f1';
            return (
              <Link
                key={enrollment.id}
                href={`/student/courses/${enrollment.id}`}
                className="card"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  border: `1px solid var(--border)`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  overflow: 'hidden',
                  padding: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                {/* Color band */}
                <div style={{ height: 6, background: color, width: '100%' }} />

                <div style={{ padding: '20px 20px 16px' }}>
                  {/* Course icon + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: `${color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <GraduationCap size={22} style={{ color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                        {enrollment.courseName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Enrolled {formatDistanceToNow(new Date(enrollment.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {/* Teacher / Group */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {enrollment.teacherName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        {enrollment.teacherName}
                      </div>
                    )}
                    {enrollment.groupName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <Users size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        {enrollment.groupName}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Open <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
