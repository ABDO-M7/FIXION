'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi } from '@/lib/api';
import { Search, Shield, UserX, UserCheck, Trash2, BookOpen, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const ROLE_FILTERS = ['all', 'student', 'teacher', 'admin'] as const;
const COURSES = ['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Subjects modal state
  const [subjectsModal, setSubjectsModal] = useState<{ user: any; selected: string[] } | null>(null);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const LIMIT = 20;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (role !== 'all') params.role = role;
      const res = await adminApi.users(params);
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [role, page]);

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await adminApi.updateUserStatus(id, !current);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !current } : u));
      toast.success(`User ${!current ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update status'); }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This is permanent.`)) return;
    try {
      await adminApi.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const openSubjectsModal = (u: any) => {
    setSubjectsModal({ user: u, selected: Array.isArray(u.subjects) ? [...u.subjects] : [] });
  };

  const toggleCourse = (course: string) => {
    if (!subjectsModal) return;
    setSubjectsModal(prev => {
      if (!prev) return prev;
      const sel = prev.selected.includes(course)
        ? prev.selected.filter(s => s !== course)
        : [...prev.selected, course];
      return { ...prev, selected: sel };
    });
  };

  const saveSubjects = async () => {
    if (!subjectsModal) return;
    setSavingSubjects(true);
    try {
      await adminApi.updateUserSubjects(subjectsModal.user.id, subjectsModal.selected);
      setUsers(prev => prev.map(u => u.id === subjectsModal.user.id ? { ...u, subjects: subjectsModal.selected } : u));
      toast.success(`Specializations saved for ${subjectsModal.user.name}`);
      setSubjectsModal(null);
    } catch { toast.error('Failed to save specializations'); }
    finally { setSavingSubjects(false); }
  };

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const roleBadge = (r: string) => {
    if (r === 'admin') return <span className="badge badge-admin">Admin</span>;
    if (r === 'teacher') return <span className="badge badge-teacher">Teacher</span>;
    return <span className="badge badge-student">Student</span>;
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{total.toLocaleString()} registered users</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." />
        </div>
        <div className="tabs" style={{ flex: 'none' }}>
          {ROLE_FILTERS.map(r => (
            <button key={r} className={`tab-btn ${role === r ? 'active' : ''}`}
              onClick={() => { setRole(r); setPage(1); }} style={{ textTransform: 'capitalize', flex: 'none', padding: '7px 14px' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Specializations</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>{roleBadge(u.role)}</td>
                <td>
                  {u.role === 'teacher' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {Array.isArray(u.subjects) && u.subjects.length > 0
                        ? u.subjects.map((s: string) => (
                            <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', fontWeight: 600 }}>
                              {s}
                            </span>
                          ))
                        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All subjects</span>
                      }
                      <button
                        onClick={() => openSubjectsModal(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                        title="Edit specializations"
                      >
                        <BookOpen size={11} /> Edit
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {u.isActive
                    ? <span className="badge badge-active">Active</span>
                    : <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>Inactive</span>}
                </td>
                <td style={{ fontSize: 12 }}>{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => toggleStatus(u.id, u.isActive)}
                      className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}`}
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteUser(u.id, u.name)} className="btn btn-danger btn-sm" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">← Prev</button>
          <span style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)} className="btn btn-secondary btn-sm">Next →</button>
        </div>
      )}

      {/* Specializations Modal */}
      {subjectsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: 420, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Set Specializations</h3>
              <button onClick={() => setSubjectsModal(null)} className="icon-btn" style={{ width: 30, height: 30 }}><X size={15} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Teacher: <strong>{subjectsModal.user.name}</strong><br />
              Select which courses this teacher can see and answer. Leave all unselected to allow all subjects.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              {COURSES.map(c => {
                const active = subjectsModal.selected.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCourse(c)}
                    className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontFamily: 'inherit', fontSize: 15, padding: '8px 16px' }}
                  >
                    {active && <Check size={12} />} {c}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSubjectsModal(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveSubjects} disabled={savingSubjects} className="btn btn-primary" style={{ flex: 1 }}>
                {savingSubjects ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
