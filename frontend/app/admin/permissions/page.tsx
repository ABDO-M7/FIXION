'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi } from '@/lib/api';
import { Search, ShieldCheck, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const groups = [
  { title: 'Student access', description: 'What students can see and submit.', roles: ['student'], items: [
    ['student_appointments', 'Request meetings', 'Allow the student to request a meeting with staff.'],
    ['student_questions', 'Ask questions', 'Allow the student to submit questions.'],
    ['student_videos', 'View videos', 'Allow the student to access course videos.'],
    ['student_assignments', 'Submit assignments', 'Allow the student to submit homework and quizzes.'],
    ['student_team_contact', 'Contact team members', 'Allow direct support contact with team members and assistants.'],
  ] },
  { title: 'Staff capabilities', description: 'What a teacher, team member, or assistant can manage.', roles: ['teacher', 'team_member', 'assistant'], items: [
    ['staff_manage_videos', 'Manage videos', 'Create and manage course videos.'],
    ['staff_manage_assignments', 'Manage assignments', 'Create, publish, and grade assignments.'],
    ['staff_manage_questions', 'Manage questions', 'View and answer student questions.'],
    ['staff_handle_appointments', 'Handle meetings', 'View and reply to student meeting requests.'],
  ] },
] as const;

export default function AdminPermissionsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.users({ page: 1, limit: 200 }).then(res => {
      const eligible = (res.data.data || []).filter((user: any) => user.role !== 'admin');
      setUsers(eligible);
      if (eligible[0]) { setSelectedId(eligible[0].id); setDraft(eligible[0].permissions || {}); }
    }).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false));
  }, []);

  const selected = users.find(user => user.id === selectedId);
  const visibleUsers = useMemo(() => users.filter(user => !search || user.name?.toLowerCase().includes(search.toLowerCase()) || user.email?.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const visibleGroups = groups.filter(group => (group.roles as readonly string[]).includes(selected?.role));

  const chooseUser = (user: any) => { setSelectedId(user.id); setDraft(user.permissions || {}); };
  const toggle = (key: string) => setDraft(previous => ({ ...previous, [key]: previous[key] === false }));
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await adminApi.updateUserPermissions(selected.id, draft);
      setUsers(previous => previous.map(user => user.id === selected.id ? { ...user, permissions: res.data.permissions || draft } : user));
      toast.success('Permissions saved');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Failed to save permissions'); }
    finally { setSaving(false); }
  };

  return <AppShell>
    <div className="page-header"><div><h1 className="page-title">Permissions</h1><p className="page-subtitle">Control what each student and staff account can see and do.</p></div><ShieldCheck size={30} style={{ color: 'var(--primary-light)' }} /></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, .35fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
      <div className="card" style={{ padding: 14 }}><div className="search-input-wrapper" style={{ marginBottom: 12 }}><Search size={14} /><input placeholder="Search users..." value={search} onChange={event => setSearch(event.target.value)} /></div>{loading ? <span className="spinner" /> : visibleUsers.map(user => <button key={user.id} onClick={() => chooseUser(user)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '11px 10px', border: 0, borderRadius: 9, background: user.id === selectedId ? 'rgba(37,214,209,.12)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}><span className="user-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{user.name?.[0]?.toUpperCase()}</span><span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', fontSize: 13 }}>{user.name}</strong><small style={{ color: 'var(--text-muted)' }}>{user.role}</small></span></button>)}</div>
      <div className="card">{selected ? <><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}><span className="user-avatar" style={{ width: 44, height: 44 }}>{selected.name?.[0]?.toUpperCase()}</span><div style={{ flex: 1 }}><h2 style={{ fontSize: 18 }}>{selected.name}</h2><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selected.email || 'No email'} · {selected.role}</p></div><button className="btn btn-primary" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save permissions'}</button></div>{visibleGroups.map(group => <section key={group.title} style={{ marginBottom: 22 }}><h3 style={{ fontSize: 14, marginBottom: 4 }}>{group.title}</h3><p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>{group.description}</p>{group.items.map(([key, title, description]) => { const enabled = draft[key] !== false; return <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}><input type="checkbox" checked={enabled} onChange={() => toggle(key)} style={{ width: 17, height: 17, accentColor: 'var(--primary)' }} /><span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 13 }}>{title}</strong><small style={{ color: 'var(--text-muted)' }}>{description}</small></span><span className={`badge ${enabled ? 'badge-active' : 'badge-pending'}`}>{enabled ? 'Allowed' : 'Blocked'}</span></label>; })}</section>)}</> : <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}><Users size={24} /><p>Select a user to manage permissions.</p></div>}</div>
    </div>
  </AppShell>;
}
