'use client';
import { useEffect, useState, type FormEvent } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi } from '@/lib/api';
import { Search, UserX, UserCheck, Trash2, BookOpen, X, Check, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const ROLE_FILTERS = ['all', 'student', 'teacher', 'team_member', 'assistant', 'admin'] as const;
const ROLE_LABELS: Record<(typeof ROLE_FILTERS)[number], string> = {
  all: 'All',
  student: 'Student',
  teacher: 'Teacher',
  team_member: 'Team member',
  assistant: 'Assistant',
  admin: 'Admin',
};
const STAFF_ROLES = ['teacher', 'team_member', 'assistant'] as const;
const COURSES = ['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [subjectsModal, setSubjectsModal] = useState<{ user: any; selected: string[] } | null>(null);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [staffModal, setStaffModal] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ user: any; password: string; confirm: string; show: boolean } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher' as (typeof STAFF_ROLES)[number],
    subjects: [] as string[],
    assignedTeacherId: '',
  });
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

  const fetchTeachers = async () => {
    try {
      const res = await adminApi.users({ page: 1, limit: 100, role: 'teacher' });
      setTeachers(res.data.data || []);
    } catch {
      setTeachers([]);
    }
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

  const openPasswordModal = (u: any) => {
    setPasswordModal({ user: u, password: '', confirm: '', show: false });
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordModal) return;
    if (passwordModal.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (passwordModal.password !== passwordModal.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await adminApi.updateUserPassword(passwordModal.user.id, passwordModal.password);
      toast.success(`Password updated for "${passwordModal.user.name}"`);
      setPasswordModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
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

  const toggleStaffCourse = (course: string) => {
    setStaffForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(course)
        ? prev.subjects.filter(s => s !== course)
        : [...prev.subjects, course],
    }));
  };

  const saveSubjects = async () => {
    if (!subjectsModal) return;
    if (subjectsModal.selected.length === 0) {
      toast.error('Choose at least one subject for this team member');
      return;
    }
    setSavingSubjects(true);
    try {
      await adminApi.updateUserSubjects(subjectsModal.user.id, subjectsModal.selected);
      setUsers(prev => prev.map(u => u.id === subjectsModal.user.id ? { ...u, subjects: subjectsModal.selected } : u));
      toast.success(`Subjects saved for ${subjectsModal.user.name}`);
      setSubjectsModal(null);
    } catch { toast.error('Failed to save subjects'); }
    finally { setSavingSubjects(false); }
  };

  const openStaffModal = () => {
    setStaffForm({ name: '', email: '', password: '', role: 'teacher', subjects: [], assignedTeacherId: '' });
    setStaffModal(true);
    fetchTeachers();
  };

  const createStaff = async (event: FormEvent) => {
    event.preventDefault();
    if (staffForm.role === 'team_member' && staffForm.subjects.length === 0) {
      toast.error('Choose the subject this team member works on');
      return;
    }
    if (staffForm.role === 'assistant' && !staffForm.assignedTeacherId) {
      toast.error('Choose the teacher this assistant works with');
      return;
    }
    if (staffForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreatingStaff(true);
    try {
      await adminApi.createStaff({
        name: staffForm.name,
        email: staffForm.email,
        password: staffForm.password,
        role: staffForm.role,
        subjects: staffForm.role === 'team_member' ? staffForm.subjects : undefined,
        assignedTeacherId: staffForm.role === 'assistant' ? staffForm.assignedTeacherId : undefined,
      });
      toast.success(`${ROLE_LABELS[staffForm.role]} added`);
      setStaffModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create staff account');
    } finally {
      setCreatingStaff(false);
    }
  };

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const roleBadge = (r: string) => {
    if (r === 'admin') return <span className="badge badge-admin">Admin</span>;
    if (r === 'teacher') return <span className="badge badge-teacher">Teacher</span>;
    if (r === 'team_member') return <span className="badge badge-team">Team member</span>;
    if (r === 'assistant') return <span className="badge badge-assistant">Assistant</span>;
    return <span className="badge badge-student">Student</span>;
  };

  const assignedTeacherName = (u: any) => u.assignedTeacher?.name || teachers.find(t => t.id === u.assignedTeacherId)?.name;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{total.toLocaleString()} registered users</p>
        </div>
        <button onClick={openStaffModal} className="btn btn-primary">
          <UserPlus size={15} /> Add staff
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." />
        </div>
        <div className="tabs" style={{ flex: 'none', flexWrap: 'wrap' }}>
          {ROLE_FILTERS.map(r => (
            <button key={r} className={`tab-btn ${role === r ? 'active' : ''}`}
              onClick={() => { setRole(r); setPage(1); }} style={{ textTransform: 'capitalize', flex: 'none', padding: '7px 14px' }}>
              {ROLE_LABELS[r]}
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
              <th>Access</th>
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
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{u.email}</span>
                        {u.phone && <span>• {u.phone}</span>}
                        {u.studentId && <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>• ID: {u.studentId}</span>}
                        {u.level && <span>• {u.level}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{roleBadge(u.role)}</td>
                <td>
                  {u.role === 'team_member' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {Array.isArray(u.subjects) && u.subjects.length > 0
                        ? u.subjects.map((s: string) => (
                            <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', fontWeight: 600 }}>
                              {s}
                            </span>
                          ))
                        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No subjects</span>
                      }
                      <button
                        onClick={() => openSubjectsModal(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                        title="Edit subjects"
                      >
                        <BookOpen size={11} /> Edit
                      </button>
                    </div>
                  ) : u.role === 'assistant' ? (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Teacher: {assignedTeacherName(u) || '—'}
                    </span>
                  ) : u.role === 'teacher' ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Own groups</span>
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
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => openPasswordModal(u)}
                      className="btn btn-secondary btn-sm"
                      title="Change Password"
                    >
                      <KeyRound size={13} /> Password
                    </button>
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

      {subjectsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: 420, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Set subjects</h3>
              <button onClick={() => setSubjectsModal(null)} className="icon-btn" style={{ width: 30, height: 30 }}><X size={15} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Team member: <strong>{subjectsModal.user.name}</strong><br />
              They can only see work for the selected subject.
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

      {staffModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <form onSubmit={createStaff} className="card" style={{ width: 480, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Add staff</h3>
              <button type="button" onClick={() => setStaffModal(false)} className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Close"><X size={15} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Create a login account for this staff member. They can use these credentials immediately.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="staff-name">Full name</label>
                <input id="staff-name" required value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} className="form-input" placeholder="e.g. Ahmed Hassan" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="staff-role">Role</label>
                <select
                  id="staff-role"
                  className="form-input"
                  value={staffForm.role}
                  onChange={e => setStaffForm(p => ({ ...p, role: e.target.value as (typeof STAFF_ROLES)[number] }))}
                >
                  <option value="teacher">Teacher</option>
                  <option value="assistant">Assistant</option>
                  <option value="team_member">Team member</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="staff-email">Login email</label>
                <input id="staff-email" type="email" required value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} className="form-input" placeholder="staff@example.com" autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="staff-password">Temporary password</label>
                <input id="staff-password" type="password" required minLength={8} value={staffForm.password} onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))} className="form-input" placeholder="At least 8 characters" autoComplete="new-password" />
              </div>
              {staffForm.role === 'teacher' && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Sees their own work across all groups.
                </p>
              )}
              {staffForm.role === 'assistant' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="staff-teacher">Works with teacher</label>
                  <select
                    id="staff-teacher"
                    required
                    className="form-input"
                    value={staffForm.assignedTeacherId}
                    onChange={e => setStaffForm(p => ({ ...p, assignedTeacherId: e.target.value }))}
                  >
                    <option value="">Select teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {teachers.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Add a teacher first, then create their assistant.</p>
                  )}
                </div>
              )}
              {staffForm.role === 'team_member' && (
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>They can only see work for this subject.</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COURSES.map(c => {
                      const active = staffForm.subjects.includes(c);
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => toggleStaffCourse(c)}
                          className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontFamily: 'inherit', fontSize: 15, padding: '8px 16px' }}
                        >
                          {active && <Check size={12} />} {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button type="button" onClick={() => setStaffModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={creatingStaff} className="btn btn-primary" style={{ flex: 1 }}>
                {creatingStaff ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating...</> : `Create ${ROLE_LABELS[staffForm.role].toLowerCase()}`}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Password Reset Modal */}
      {passwordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={17} style={{ color: 'var(--primary-light)' }} /> Change User Password
              </h3>
              <button onClick={() => setPasswordModal(null)} className="icon-btn" style={{ width: 28, height: 28 }}>
                <X size={15} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Setting a new password for <strong>{passwordModal.user.name}</strong> ({passwordModal.user.email || 'Student'}).
            </p>
            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={passwordModal.show ? 'text' : 'password'}
                    value={passwordModal.password}
                    onChange={e => setPasswordModal(p => p ? { ...p, password: e.target.value } : null)}
                    className="form-input"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    autoFocus
                    style={{ paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordModal(p => p ? { ...p, show: !p.show } : null)}
                    className="icon-btn"
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', opacity: 0.7, width: 26, height: 26 }}
                    title={passwordModal.show ? 'Hide password' : 'Show password'}
                  >
                    {passwordModal.show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Confirm New Password</label>
                <input
                  type={passwordModal.show ? 'text' : 'password'}
                  value={passwordModal.confirm}
                  onChange={e => setPasswordModal(p => p ? { ...p, confirm: e.target.value } : null)}
                  className="form-input"
                  placeholder="Repeat new password"
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setPasswordModal(null)} className="btn btn-secondary" disabled={savingPassword}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Updating...</>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
