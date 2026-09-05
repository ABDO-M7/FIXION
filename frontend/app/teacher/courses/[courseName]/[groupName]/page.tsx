'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import {
  ArrowLeft, GraduationCap, Users, Plus, Trash2, X,
  ClipboardList, BookOpen, BarChart2, ChevronDown, ChevronRight,
  CheckCircle, Clock, Upload, Edit3
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

type Tab = 'QUIZ' | 'HOMEWORK' | 'GRADES';

// ── Create Assignment Modal ─────────────────────────────────────────────────
function CreateModal({
  type, courseName, groupName, onClose, onCreated,
}: {
  type: 'QUIZ' | 'HOMEWORK';
  courseName: string;
  groupName: string;
  onClose: () => void;
  onCreated: (newId?: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', maxGrade: '100' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.maxGrade || +form.maxGrade < 1) { toast.error('Max grade must be at least 1'); return; }
    setSaving(true);
    try {
      const res = await assignmentsApi.create({ ...form, maxGrade: +form.maxGrade, type, courseName, groupName });
      toast.success(`${type === 'QUIZ' ? 'Quiz' : 'Homework'} created!`);
      onCreated((res.data as any).id);
      onClose();
      // For quizzes: redirect to builder
      if (type === 'QUIZ') {
        router.push(`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/quiz/${(res.data as any).id}`);
      }
    } catch {
      toast.error('Failed to create');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>
            {type === 'QUIZ' ? '📝 New Quiz' : '📚 New Homework'}
          </h3>
          <button onClick={onClose} className="icon-btn" style={{ width: 28, height: 28 }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder={type === 'QUIZ' ? 'e.g. Chapter 3 Quiz' : 'e.g. Exercises p.45'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Instructions, notes..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Due Date (optional)</label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Grade *</label>
              <input
                type="number" min={1} max={1000}
                className="form-input"
                value={form.maxGrade}
                onChange={e => setForm(p => ({ ...p, maxGrade: e.target.value }))}
                placeholder="100"
              />
            </div>
          </div>
          {type === 'QUIZ' && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--primary-light)' }}>
              📝 After creating, you'll be taken to the <strong>Quiz Builder</strong> to add questions.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (type === 'QUIZ' ? 'Create & Build →' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




// ── Grade Matrix Tab ────────────────────────────────────────────────────────
function GradesTab({ courseName, groupName }: { courseName: string; groupName: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsApi.gradeMatrix(courseName, groupName)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseName, groupName]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" /></div>;
  if (!data || data.students.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No students yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students enrolled in this group.</p>
      </div>
    );
  }

  const quizzes   = data.assignments.filter((a: any) => a.type === 'QUIZ');
  const homeworks  = data.assignments.filter((a: any) => a.type === 'HOMEWORK');
  // Always render in the SAME order as the header: quizzes first, then homeworks
  const orderedAssignments = [...quizzes, ...homeworks];

  const getCellStyle = (grade: number | null | undefined, maxGrade: number) => {
    if (grade === null || grade === undefined) return {
      padding: '8px 12px', fontSize: 13, textAlign: 'center' as const,
      color: 'var(--text-muted)', fontWeight: 400,
    };
    const pct = maxGrade > 0 ? (grade / maxGrade) * 100 : 0;
    return {
      padding: '8px 12px', fontSize: 13, textAlign: 'center' as const,
      background: pct >= 70 ? 'rgba(16,185,129,0.1)' : pct >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
      color: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
      fontWeight: 700,
    };
  };

  return (
    <div className="table-container" style={{ overflowX: 'auto' }}>
      <table style={{ minWidth: 600 }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, minWidth: 160 }}>Student</th>
            {quizzes.length > 0 && (
              <th colSpan={quizzes.length} style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', borderLeft: '2px solid var(--border)' }}>
                📝 QUIZZES
              </th>
            )}
            {homeworks.length > 0 && (
              <th colSpan={homeworks.length} style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#f59e0b', borderLeft: '2px solid var(--border)' }}>
                📚 HOMEWORK
              </th>
            )}
          </tr>
          <tr>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, background: 'var(--bg-surface)' }}></th>
            {orderedAssignments.map((a: any, i: number) => (
              <th key={a.id} style={{
                padding: '8px 12px', fontSize: 11, fontWeight: 600,
                textAlign: 'center', maxWidth: 120,
                background: 'var(--bg-surface)',
                borderLeft: (i === 0 || (i === quizzes.length && homeworks.length > 0)) ? '2px solid var(--border)' : '1px solid var(--border)',
              }}>
                <Link
                  href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/submissions/${a.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  title="Click to view submissions"
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100, color: 'var(--primary-light)' }}>
                    {a.title} ↗
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>/ {a.maxGrade ?? 100}</div>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.students.map((student: any) => (
            <tr key={student.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 14px', fontSize: 13, minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{student.name || student.email || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.email}</div>
                {student.studentId && (
                  <div style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 600, marginTop: 2 }}>
                    ID: {student.studentId}
                  </div>
                )}
              </td>
              {orderedAssignments.map((a: any, i: number) => {
                const grade = data.gradeMap[student.id]?.[a.id];
                const maxGrade = a.maxGrade ?? 100;
                return (
                  <td key={a.id} style={{
                    ...getCellStyle(grade, maxGrade),
                    borderLeft: (i === 0 || (i === quizzes.length && homeworks.length > 0)) ? '2px solid var(--border)' : '1px solid var(--border)',
                  }}>
                    {grade !== null && grade !== undefined ? `${grade} / ${maxGrade}` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function GroupDetailPage() {
  const { courseName, groupName } = useParams<{ courseName: string; groupName: string }>();
  const decoded = decodeURIComponent(courseName);
  const decodedGroup = decodeURIComponent(groupName);
  const color = COURSE_COLORS[decoded] || '#6366f1';

  const [tab, setTab] = useState<Tab>('QUIZ');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<'QUIZ' | 'HOMEWORK' | null>(null);

  const fetchAssignments = useCallback(() => {
    setLoading(true);
    const type = tab === 'GRADES' ? undefined : tab;
    (type ? assignmentsApi.list(decoded, decodedGroup, type) : Promise.resolve({ data: [] }))
      .then(r => setAssignments(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [decoded, decodedGroup, tab]);

  useEffect(() => {
    if (tab !== 'GRADES') fetchAssignments();
  }, [tab, fetchAssignments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await assignmentsApi.delete(id);
      toast.success('Deleted');
      fetchAssignments();
    } catch { toast.error('Failed to delete'); }
  };

  const handlePublish = async (a: any) => {
    if (a.type === 'QUIZ') {
      // Better to publish quizzes from Quiz Builder so validation is obvious, but we can allow it here too
      // The backend will enforce it.
    }
    try {
      await assignmentsApi.publish(a.id);
      toast.success('Published successfully!');
      fetchAssignments();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to publish');
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'QUIZ', label: 'Quiz', icon: ClipboardList },
    { id: 'HOMEWORK', label: 'Homework', icon: BookOpen },
    { id: 'GRADES', label: 'Student Grades', icon: BarChart2 },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Link href={`/teacher/courses/${courseName}`} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Groups
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={22} style={{ color }} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{decodedGroup}</h1>
              <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={13} /> {decoded}
              </p>
            </div>
          </div>
        </div>

        {tab !== 'GRADES' && (
          <button
            onClick={() => setCreateType(tab as 'QUIZ' | 'HOMEWORK')}
            className="btn btn-primary"
          >
            <Plus size={14} /> New {tab === 'QUIZ' ? 'Quiz' : 'Homework'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 13, fontWeight: 600,
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: tab === t.id ? `2px solid ${color}` : '2px solid transparent',
                color: tab === t.id ? color : 'var(--text-secondary)',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'GRADES' ? (
        <GradesTab courseName={decoded} groupName={decodedGroup} />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : assignments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>
            {tab === 'QUIZ' ? '📝' : '📚'}
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>No {tab === 'QUIZ' ? 'quizzes' : 'homework'} yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            Create your first one with the button above.
          </p>
          <button onClick={() => setCreateType(tab as 'QUIZ' | 'HOMEWORK')} className="btn btn-primary">
            <Plus size={14} /> New {tab === 'QUIZ' ? 'Quiz' : 'Homework'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assignments.map(a => (
            <div
              key={a.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: a.type === 'QUIZ' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {a.type === 'QUIZ'
                  ? <ClipboardList size={20} style={{ color: '#6366f1' }} />
                  : <BookOpen size={20} style={{ color: '#f59e0b' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</div>
                  {a.isPublished ? (
                    <span className="badge badge-answered" style={{ fontSize: 10, padding: '2px 6px' }}>Published</span>
                  ) : (
                    <span className="badge badge-pending" style={{ fontSize: 10, padding: '2px 6px' }}>Draft</span>
                  )}
                </div>
                {a.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                    {a.description}
                  </div>
                )}
                {a.dueDate && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Due: {format(new Date(a.dueDate), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {a.type === 'QUIZ' && (
                  <Link
                    href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/quiz/${a.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit3 size={13} /> Edit Quiz
                  </Link>
                )}
                {!a.isPublished && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handlePublish(a)}
                  >
                    Publish
                  </button>
                )}
                <Link
                  href={`/teacher/courses/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}/submissions/${a.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  View Submissions <ChevronRight size={13} />
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {createType && (
        <CreateModal
          type={createType}
          courseName={decoded}
          groupName={decodedGroup}
          onClose={() => setCreateType(null)}
          onCreated={fetchAssignments}
        />
      )}
    </AppShell>
  );
}
