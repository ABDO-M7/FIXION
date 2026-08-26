'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import { Users, ChevronRight, ArrowLeft, GraduationCap } from 'lucide-react';
import Link from 'next/link';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

const GROUP_ICONS = ['🅰', '🅱', '🅲', '🅳', '🅴', '🅵'];

export default function CourseGroupsPage() {
  const { courseName } = useParams<{ courseName: string }>();
  const decoded = decodeURIComponent(courseName);
  const color = COURSE_COLORS[decoded] || '#6366f1';

  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsApi.groups(decoded)
      .then(r => setGroups(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [decoded]);

  return (
    <AppShell>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <Link href="/teacher/courses" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Courses
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={22} style={{ color }} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{decoded}</h1>
              <p className="page-subtitle">
                {loading ? '...' : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>👥</div>
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No groups yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            No students have enrolled in this course yet.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {groups.map((group, i) => (
            <Link
              key={group}
              href={`/teacher/courses/${courseName}/${encodeURIComponent(group)}`}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                textDecoration: 'none', cursor: 'pointer',
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
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                <Users size={22} style={{ color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                  {group}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {decoded}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
