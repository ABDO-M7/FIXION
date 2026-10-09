'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import { Users, ChevronRight, ArrowLeft, GraduationCap, User, Calendar } from 'lucide-react';
import Link from 'next/link';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

type GroupItem = {
  groupName: string;
  courseName?: string;
  teacherName?: string | null;
  teacherId?: string | null;
  studentCount?: number;
};

export default function CourseGroupsPage() {
  const { courseName } = useParams<{ courseName: string }>();
  const decoded = decodeURIComponent(courseName);
  const color = COURSE_COLORS[decoded] || '#6366f1';

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsApi.groupsDetailed(decoded)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        if (list.length === 0) {
          setGroups([{ groupName: 'Group 1', teacherName: 'مدرس المادة', studentCount: 0 }]);
        } else {
          setGroups(list);
        }
      })
      .catch(() => {
        assignmentsApi.groups(decoded)
          .then(r => {
            const list = Array.isArray(r.data) ? r.data : [];
            setGroups(list.map((g: string) => ({ groupName: g, teacherName: 'مدرس المادة', studentCount: 0 })));
          })
          .catch(() => setGroups([]));
      })
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
          {groups.map((group) => (
            <Link
              key={group.groupName}
              href={`/teacher/courses/${courseName}/${encodeURIComponent(group.groupName)}`}
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
              <div style={{ height: 4, background: color }} />
              <div style={{ padding: '20px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Calendar size={22} style={{ color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
                      {group.groupName}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {decoded} Course
                    </span>
                  </div>
                </div>

                {/* Teacher and enrolled count */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <User size={13} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                    <span>المدرس: <strong style={{ color: '#fff' }}>{group.teacherName || 'مدرس المادة'}</strong></span>
                  </div>
                  {typeof group.studentCount === 'number' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      <Users size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span>{group.studentCount} طالب مسجل</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    فتح المنهج والحصص <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
