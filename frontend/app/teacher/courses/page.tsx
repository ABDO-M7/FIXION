'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import { GraduationCap, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsApi.myCourses()
      .then(r => setCourses(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">Courses matching your specializations</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : courses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🎓</div>
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No specializations set</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Ask an admin to assign subject specializations to your account.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {courses.map(course => {
            const color = COURSE_COLORS[course] || '#6366f1';
            return (
              <Link
                key={course}
                href={`/teacher/courses/${encodeURIComponent(course)}`}
                className="card"
                style={{
                  display: 'block', textDecoration: 'none', padding: 0,
                  overflow: 'hidden', cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
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
                <div style={{ height: 6, background: color }} />
                <div style={{ padding: '22px 20px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 12,
                      background: `${color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <GraduationCap size={24} style={{ color }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
                      {course}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      View Groups <ChevronRight size={14} />
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
