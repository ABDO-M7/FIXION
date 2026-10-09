'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi, adminApi } from '@/lib/api';
import { Users, ArrowLeft, GraduationCap, Plus, ChevronRight, Layers, X, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

export default function AdminCourseGroupsPage() {
  const { courseName } = useParams<{ courseName: string }>();
  const decoded = decodeURIComponent(courseName);
  const color = COURSE_COLORS[decoded] || '#6366f1';
  const router = useRouter();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

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
          .catch(() => {
            setGroups([{ groupName: 'Group 1', teacherName: 'مدرس المادة', studentCount: 0 }]);
          });
      })
      .finally(() => setLoading(false));

    adminApi.users({ page: 1, limit: 100, role: 'teacher' })
      .then(r => setTeachers(r.data?.data || []))
      .catch(() => {});
  }, [decoded]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    const name = newGroupName.trim();
    const assignedTeacher = teachers.find(t => t.id === selectedTeacherId);
    if (!groups.some(g => g.groupName === name)) {
      setGroups(prev => [...prev, {
        groupName: name,
        teacherName: assignedTeacher?.name || 'مدرس المادة',
        teacherId: assignedTeacher?.id || null,
        studentCount: 0,
      }]);
    }
    setShowAddGroup(false);
    toast.success(`Group "${name}" ready!`);
    router.push(`/admin/courses/${encodeURIComponent(decoded)}/${encodeURIComponent(name)}`);
  };

  return (
    <AppShell>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Link href="/admin/courses" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Courses
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <GraduationCap size={24} style={{ color }} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{decoded}</h1>
              <p className="page-subtitle">Select or create a group to manage its lesson workflow</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setNewGroupName(''); setShowAddGroup(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Add Group
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 34, height: 34, borderWidth: 3 }} />
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 18 }}>
          {groups.map((group) => (
            <Link
              key={group.groupName}
              href={`/admin/courses/${encodeURIComponent(decoded)}/${encodeURIComponent(group.groupName)}`}
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
                    background: 'rgba(99,102,241,0.12)',
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Layers size={13} /> Open Workflow
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    Manage Lessons <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add New Group / Schedule</h3>
              <button className="icon-btn" onClick={() => setShowAddGroup(false)}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Group / Schedule Name (اسم المجموعة أو الميعاد) *</label>
                <input
                  className="form-input"
                  placeholder="e.g. مجموعة السبت 4 عصراً or Group A"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assign Teacher (تحديد المدرس المسئول)</label>
                <select
                  className="form-input"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">— اختر المدرس —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.subjects?.includes(decoded) ? '⭐ (مدرس المادة)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowAddGroup(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateGroup}>Create & Open Workflow →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
