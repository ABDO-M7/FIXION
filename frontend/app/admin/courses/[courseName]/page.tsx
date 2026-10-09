'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import { Users, ArrowLeft, GraduationCap, Plus, ChevronRight, Layers, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

export default function AdminCourseGroupsPage() {
  const { courseName } = useParams<{ courseName: string }>();
  const decoded = decodeURIComponent(courseName);
  const color = COURSE_COLORS[decoded] || '#6366f1';
  const router = useRouter();

  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    assignmentsApi.groups(decoded)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        if (list.length === 0) {
          setGroups(['Group 1']);
        } else {
          setGroups(list);
        }
      })
      .catch(() => {
        setGroups(['Group 1']);
      })
      .finally(() => setLoading(false));
  }, [decoded]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    const name = newGroupName.trim();
    if (!groups.includes(name)) {
      setGroups(prev => [...prev, name]);
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
          {groups.map(group => (
            <Link
              key={group}
              href={`/admin/courses/${encodeURIComponent(decoded)}/${encodeURIComponent(group)}`}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: 'rgba(99,102,241,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Users size={20} style={{ color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
                      {group}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {decoded} Course
                    </span>
                  </div>
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
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add New Group</h3>
              <button className="icon-btn" onClick={() => setShowAddGroup(false)}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Group Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Group A or Intensive Group"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  autoFocus
                />
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
