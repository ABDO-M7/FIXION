'use client';
import { useEffect, useState, type FormEvent } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi, codesApi, assignmentsApi, videosApi } from '@/lib/api';
import {
  Key, Copy, Trash2, CheckCircle, Clock, GraduationCap,
  FileDown, Printer, BarChart3, Timer, Camera, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type CodeType = 'timed' | 'snapshot' | 'chapter';
type LessonScope = { chapterName: string; lessonName: string };
type ChapterOption = { name: string; lessons: string[] };
type GroupOption = { groupName: string; teacherId?: string | null; teacherIds?: string[] };

const CODE_TYPE_META: Record<CodeType, { label: string; description: string; color: string; Icon: any }> = {
  timed: {
    label: 'Timed',
    description: 'Access for a fixed number of days, then locks.',
    color: '#6366f1',
    Icon: Timer,
  },
  snapshot: {
    label: 'Snapshot',
    description: 'Content published up to redemption date stays accessible forever.',
    color: '#10b981',
    Icon: Camera,
  },
  chapter: {
    label: 'Chapter',
    description: 'Access selected chapters or lessons forever, or set a time limit.',
    color: '#f59e0b',
    Icon: BookOpen,
  },
};

const ROLE_FILTERS = ['all', 'used', 'unused'] as const;

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<any[]>([]);
  const [usageMonth, setUsageMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [teacherUsage, setTeacherUsage] = useState<{ teacherName: string; usedCodes: number }[]>([]);
  const [usageTotal, setUsageTotal] = useState(0);
  const [teachers, setTeachers] = useState<{ id: string; name: string; subjects?: string[] }[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>(['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه']);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableGroupDetails, setAvailableGroupDetails] = useState<GroupOption[]>([]);
  const [chapterOptions, setChapterOptions] = useState<ChapterOption[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState('');
  const [customGroup, setCustomGroup] = useState(false);

  const [form, setForm] = useState({
    codeType: 'timed' as CodeType,
    plan: 'monthly',
    quantity: '10',
    durationDays: '',
    chapterDuration: 'permanent' as 'permanent' | 'limited',
    codeExpiresAt: '',
    courseName: '',
    teacherId: '',
    groupName: '',
    minLength: '16',
    maxLength: '16',
    includeLetters: true,
    accessScope: { chapters: [] as string[], lessons: [] as LessonScope[] },
  });
  const LIMIT = 50;
  const groupBelongsToTeacher = (group: GroupOption, teacherId: string) =>
    group.teacherId === teacherId || group.teacherIds?.includes(teacherId) === true;
  const hasTeacherLinkedGroups = availableGroupDetails.some(group => Boolean(group.teacherId || group.teacherIds?.length));
  const selectableGroups = form.codeType === 'chapter' && form.teacherId && hasTeacherLinkedGroups
    ? availableGroupDetails.filter(group => groupBelongsToTeacher(group, form.teacherId)).map(group => group.groupName)
    : availableGroups;

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (filter !== 'all') params.isUsed = filter === 'used';
      const res = await codesApi.list(params);
      setCodes(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCodes(); }, [filter, page]);

  useEffect(() => {
    codesApi.teacherUsage(usageMonth).then(res => {
      setTeacherUsage(res.data.teachers || []);
      setUsageTotal(res.data.totalUsed || 0);
    }).catch(() => { setTeacherUsage([]); setUsageTotal(0); });
  }, [usageMonth]);

  useEffect(() => {
    adminApi.users({ page: 1, limit: 100, role: 'teacher' })
      .then(res => setTeachers(res.data.data || []))
      .catch(() => setTeachers([]));

    assignmentsApi.myCourses()
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        const fallback = ['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه'];
        setAvailableCourses(Array.from(new Set([...fallback, ...list])));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    if (!form.courseName) {
      setAvailableGroups([]);
      setAvailableGroupDetails([]);
      setGroupError('');
      setCustomGroup(false);
      setLoadingGroups(false);
      return () => { active = false; };
    }
    setLoadingGroups(true);
    setGroupError('');
    assignmentsApi.groupsDetailed(form.courseName)
      .then(res => {
        if (!active) return;
        const list = Array.isArray(res.data) ? res.data : [];
        const details = list.map((g: any) => typeof g === 'string' ? { groupName: g } : g)
          .filter((g: any) => g.groupName);
        const groupNames = details.map((g: GroupOption) => g.groupName);
        const resolvedGroups = groupNames;
        setAvailableGroups(resolvedGroups);
        setAvailableGroupDetails(details);
        setCustomGroup(false);
        setForm(p => {
          const nextGroup = p.groupName && resolvedGroups.includes(p.groupName) ? p.groupName : (resolvedGroups[0] || '');
          const matchedGroup = details.find((g: GroupOption) => g.groupName === nextGroup);
          const nextTeacherId = (!p.teacherId && matchedGroup?.teacherId) ? matchedGroup.teacherId : p.teacherId;
          return { ...p, groupName: nextGroup, teacherId: nextTeacherId || p.teacherId };
        });
      })
      .catch(() => {
        assignmentsApi.groups(form.courseName)
          .then(res => {
            if (!active) return;
            const list = Array.isArray(res.data) ? res.data : [];
            const resolvedGroups = list;
            setAvailableGroups(resolvedGroups);
            setAvailableGroupDetails(list.map((groupName: string) => ({ groupName })));
            setForm(p => ({
              ...p,
              groupName: p.groupName && resolvedGroups.includes(p.groupName) ? p.groupName : (resolvedGroups[0] || ''),
            }));
          })
          .catch(() => {
            if (active) {
              setAvailableGroups([]);
              setAvailableGroupDetails([]);
              setGroupError('Could not load groups for this course. Please try again.');
            }
          });
      })
      .finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, [form.courseName]);

  useEffect(() => {
    let active = true;
    setChapterOptions([]);
    setOutlineError('');
    setForm(p => ({ ...p, accessScope: { chapters: [], lessons: [] } }));
    if (form.codeType !== 'chapter' || !form.courseName || !form.groupName || !form.teacherId || customGroup) {
      setLoadingOutline(false);
      return () => { active = false; };
    }

    setLoadingOutline(true);
    Promise.allSettled([
      videosApi.teacherList(form.courseName, form.groupName, form.teacherId),
      assignmentsApi.list(form.courseName, form.groupName),
    ]).then(([videosResult, assignmentsResult]) => {
      if (!active) return;
      const videos = videosResult.status === 'fulfilled' && Array.isArray(videosResult.value.data)
        ? videosResult.value.data
        : [];
      const assignments = assignmentsResult.status === 'fulfilled' && Array.isArray(assignmentsResult.value.data)
        ? assignmentsResult.value.data.filter((item: any) => item.teacherId === form.teacherId)
        : [];

      const byChapter = new Map<string, Set<string>>();
      for (const item of [...videos, ...assignments]) {
        const chapterName = String(item.chapterName || '').trim();
        const lessonName = String(item.lessonName || '').trim();
        if (!chapterName) continue;
        if (!byChapter.has(chapterName)) byChapter.set(chapterName, new Set());
        if (lessonName) byChapter.get(chapterName)!.add(lessonName);
      }
      setChapterOptions(Array.from(byChapter, ([name, lessons]) => ({
        name,
        lessons: Array.from(lessons).sort((a, b) => a.localeCompare(b)),
      })).sort((a, b) => a.name.localeCompare(b.name)));
      if (videosResult.status === 'rejected' && assignmentsResult.status === 'rejected') {
        setOutlineError('Could not load this teacher’s course content. Please try again.');
      } else if (videosResult.status === 'rejected' || assignmentsResult.status === 'rejected') {
        setOutlineError('Some content could not be loaded; the available chapters and lessons may be incomplete.');
      }
    }).finally(() => {
      if (active) setLoadingOutline(false);
    });
    return () => { active = false; };
  }, [form.codeType, form.courseName, form.groupName, form.teacherId, customGroup]);

  const toggleChapter = (chapterName: string) => {
    setForm(p => {
      const selected = p.accessScope.chapters.includes(chapterName);
      return {
        ...p,
        accessScope: {
          chapters: selected
            ? p.accessScope.chapters.filter(chapter => chapter !== chapterName)
            : [...p.accessScope.chapters, chapterName],
          lessons: p.accessScope.lessons.filter(lesson => lesson.chapterName !== chapterName),
        },
      };
    });
  };

  const toggleLesson = (lesson: LessonScope) => {
    setForm(p => {
      if (p.accessScope.chapters.includes(lesson.chapterName)) return p;
      const selected = p.accessScope.lessons.some(item =>
        item.chapterName === lesson.chapterName && item.lessonName === lesson.lessonName,
      );
      return {
        ...p,
        accessScope: {
          ...p.accessScope,
          lessons: selected
            ? p.accessScope.lessons.filter(item =>
                item.chapterName !== lesson.chapterName || item.lessonName !== lesson.lessonName,
              )
            : [...p.accessScope.lessons, lesson],
        },
      };
    });
  };

  const generate = async () => {
    const quantity = Number(form.quantity);
    const minLength = Number(form.minLength);
    const maxLength = Number(form.maxLength);
    const durationDays = form.codeType === 'chapter'
      ? form.chapterDuration === 'limited' ? Number(form.durationDays) : undefined
      : form.durationDays ? Number(form.durationDays) : undefined;

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) { toast.error('Quantity must be 1–500'); return; }
    if (!Number.isInteger(minLength) || !Number.isInteger(maxLength) || minLength < 4 || maxLength > 64 || minLength > maxLength) { toast.error('Length must be 4–64, min ≤ max'); return; }
    if (!form.courseName.trim()) { toast.error('Course is required for all code types'); return; }
    if (form.courseName && !form.teacherId) { toast.error('Select a teacher for this course'); return; }
    if (form.codeType === 'chapter' && !form.groupName.trim()) { toast.error('Select a group for chapter codes'); return; }
    if (form.codeType === 'chapter' && !form.accessScope.chapters.length && !form.accessScope.lessons.length) { toast.error('Select at least one chapter or lesson'); return; }
    if (form.codeType === 'chapter' && form.chapterDuration === 'limited' && (!Number.isInteger(durationDays) || !durationDays || durationDays < 1 || durationDays > 3650)) { toast.error('Access duration must be between 1 and 3650 days'); return; }

    setGenerating(true);
    try {
      const res = await codesApi.generate({
        plan: form.plan,
        quantity,
        codeType: form.codeType,
        durationDays,
        accessScope: form.codeType === 'chapter' ? form.accessScope : undefined,
        codeExpiresAt: form.codeExpiresAt || undefined,
        courseName: form.courseName || undefined,
        teacherId: form.teacherId || undefined,
        groupName: form.groupName || undefined,
        minLength,
        maxLength,
        includeLetters: form.includeLetters,
      });
      const generated = Array.isArray(res.data) ? res.data : [];
      setLastGenerated(generated);
      toast.success(`${generated.length} codes generated!`);
      fetchCodes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate codes');
    } finally { setGenerating(false); }
  };

  const exportWord = () => {
    if (!lastGenerated.length) return;
    const rows = lastGenerated.map(code =>
      `<tr><td>${code.code}</td><td>${CODE_TYPE_META[code.codeType as CodeType]?.label ?? code.codeType}</td><td>${code.courseName || '—'}</td><td>${code.expiresAt ? format(new Date(code.expiresAt), 'MMM d, yyyy') : 'No expiry'}</td></tr>`
    ).join('');
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:left}</style></head><body><h1>Subscription Codes</h1><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Code</th><th>Type</th><th>Course</th><th>Expires</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `codes-${new Date().toISOString().slice(0, 10)}.doc`; link.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    if (!lastGenerated.length) return;
    const rows = lastGenerated.map(code =>
      `<div class="code"><strong>${code.code}</strong><span>${CODE_TYPE_META[code.codeType as CodeType]?.label ?? code.codeType}${code.courseName ? ' · ' + code.courseName : ''}${code.expiresAt ? ' · ' + format(new Date(code.expiresAt), 'MMM d, yyyy') : ''}</span></div>`
    ).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Codes</title><style>body{font-family:Arial;padding:28px;color:#111}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.code{border:1px solid #bbb;border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:8px}.code strong{font:700 20px monospace;letter-spacing:1px}.code span{font-size:12px;color:#555}@media print{button{display:none}}</style></head><body><h1>Subscription Codes</h1><p>Generated: ${new Date().toLocaleString()}</p><div class="grid">${rows}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success('Code copied!'); };
  const copyAll = () => {
    const unused = codes.filter(c => !c.isUsed).map(c => c.code).join('\n');
    navigator.clipboard.writeText(unused);
    toast.success(`${codes.filter(c => !c.isUsed).length} unused codes copied!`);
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this code?')) return;
    try {
      await codesApi.revoke(id);
      setCodes(prev => prev.filter(c => c.id !== id));
      toast.success('Code revoked');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to revoke'); }
  };

  const selectedTypeMeta = CODE_TYPE_META[form.codeType];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Codes</h1>
          <p className="page-subtitle">{total.toLocaleString()} codes total</p>
        </div>
        {codes.some(c => !c.isUsed) && (
          <button onClick={copyAll} className="btn btn-secondary">
            <Copy size={14} /> Copy All Unused
          </button>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Generator */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Generate New Batch</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Code type selector */}
            <div className="form-group">
              <label className="form-label">Code Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(Object.entries(CODE_TYPE_META) as [CodeType, typeof CODE_TYPE_META[CodeType]][]).map(([type, meta]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, codeType: type }))}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '10px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      border: `2px solid ${form.codeType === type ? meta.color : 'var(--border)'}`,
                      background: form.codeType === type ? `${meta.color}18` : 'var(--bg-elevated)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <meta.Icon size={18} style={{ color: meta.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: form.codeType === type ? meta.color : 'var(--text-secondary)' }}>{meta.label}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{selectedTypeMeta.description}</p>
            </div>

            {/* Timed: duration */}
            {form.codeType === 'timed' && (
              <div className="form-group">
                <label className="form-label">Duration (days)</label>
                <input
                  type="number" min={1} max={365}
                  placeholder="Leave empty to use plan default (7 or 30)"
                  value={form.durationDays}
                  onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))}
                  className="form-input"
                />
              </div>
            )}

            {/* Chapter: scope */}
            {form.codeType === 'chapter' && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Choose the course, teacher, and group below to load that teacher’s chapters and lessons.
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: form.codeType === 'chapter' ? '1fr' : '1fr 1fr', gap: 10 }}>
              {form.codeType !== 'chapter' && (
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} className="form-input" style={{ appearance: 'auto' }}>
                    <option value="weekly">Weekly (7 days)</option>
                    <option value="monthly">Monthly (30 days)</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Quantity (max 500)</label>
                <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className="form-input" min={1} max={500} />
              </div>
            </div>

            {/* Course info */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-light)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={13} /> Course Info
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Course</label>
                  <select
                    value={form.courseName}
                    onChange={e => setForm(p => ({
                      ...p,
                      courseName: e.target.value,
                      teacherId: '',
                      groupName: '',
                      accessScope: { chapters: [], lessons: [] },
                    }))}
                    className="form-input"
                    style={{ appearance: 'auto', fontSize: 13 }}
                  >
                    <option value="">— Select course —</option>
                    {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Teacher</label>
                    <select
                      value={form.teacherId}
                      onChange={e => {
                        const teacherId = e.target.value;
                        const teacherGroups = availableGroupDetails
                          .filter(group => groupBelongsToTeacher(group, teacherId))
                          .map(group => group.groupName);
                        const shouldFilterGroups = form.codeType === 'chapter' && hasTeacherLinkedGroups;
                        setForm(p => ({
                          ...p,
                          teacherId,
                          groupName: shouldFilterGroups
                            ? (teacherGroups.includes(p.groupName) ? p.groupName : (teacherGroups[0] || ''))
                            : p.groupName,
                          accessScope: { chapters: [], lessons: [] },
                        }));
                      }}
                      className="form-input"
                      style={{ fontSize: 13 }}
                    >
                      <option value="">— Select teacher —</option>
                      {teachers
                        .filter(t => !form.courseName || !t.subjects?.length || t.subjects.includes(form.courseName) || t.id === form.teacherId)
                        .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 0 }}>Group</label>
                      {form.courseName && availableGroups.length > 0 && form.codeType !== 'chapter' && (
                        <button type="button" onClick={() => setCustomGroup(!customGroup)} style={{ fontSize: 11, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {customGroup ? 'Pick from list' : '+ Custom'}
                        </button>
                      )}
                    </div>
                    {loadingGroups ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Loading...
                      </div>
                    ) : customGroup ? (
                      <input value={form.groupName} onChange={e => setForm(p => ({ ...p, groupName: e.target.value }))} className="form-input" placeholder="e.g. Group A" style={{ fontSize: 13 }} />
                    ) : (
                      <select
                        value={form.groupName}
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setCustomGroup(true);
                            setForm(p => ({ ...p, groupName: '' }));
                          } else {
                            const selectedGroup = availableGroupDetails.find(group => group.groupName === e.target.value);
                            setForm(p => ({
                              ...p,
                              groupName: e.target.value,
                              teacherId: form.codeType === 'chapter'
                                ? p.teacherId || selectedGroup?.teacherId || ''
                                : selectedGroup?.teacherId || p.teacherId,
                            }));
                          }
                        }}
                        className="form-input" style={{ fontSize: 13, appearance: 'auto' }} disabled={!form.courseName}
                      >
                        {!form.courseName ? <option value="">— Select course first —</option> : (
                          <>
                            <option value="">
                              {form.codeType === 'chapter' && form.teacherId && selectableGroups.length === 0
                                ? '— No groups assigned to this teacher —'
                                : '— Select group —'}
                            </option>
                            {selectableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            {form.codeType !== 'chapter' && <option value="__custom__">+ Custom group...</option>}
                          </>
                        )}
                      </select>
                    )}
                    {groupError && <p role="alert" style={{ color: 'var(--danger)', fontSize: 11, margin: '4px 0 0' }}>{groupError}</p>}
                    {form.codeType === 'chapter' && form.teacherId && !loadingGroups && hasTeacherLinkedGroups && selectableGroups.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0' }}>No course groups are assigned to this teacher.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {form.codeType === 'chapter' && (
              <>
                <div className="form-group">
                  <label className="form-label">Chapters and lessons</label>
                  {!form.courseName || !form.groupName || !form.teacherId ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Select a course, teacher, and group first.</p>
                  ) : loadingOutline ? (
                    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading this teacher’s content...
                    </div>
                  ) : outlineError ? (
                    <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: 12 }}>{outlineError}</p>
                  ) : chapterOptions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No chapters or lessons found for this teacher in the selected group.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto', padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                      {chapterOptions.map(chapter => {
                        const wholeChapterSelected = form.accessScope.chapters.includes(chapter.name);
                        return (
                          <fieldset key={chapter.name} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', margin: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 30, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                              <input type="checkbox" checked={wholeChapterSelected} onChange={() => toggleChapter(chapter.name)} />
                              {chapter.name} <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 400 }}>· full chapter</span>
                            </label>
                            {chapter.lessons.length > 0 && (
                              <div style={{ display: 'grid', gap: 4, paddingInlineStart: 24, marginTop: 4 }}>
                                {chapter.lessons.map(lessonName => {
                                  const selected = form.accessScope.lessons.some(item =>
                                    item.chapterName === chapter.name && item.lessonName === lessonName,
                                  );
                                  return (
                                    <label key={lessonName} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28, fontSize: 12, color: 'var(--text-secondary)', cursor: wholeChapterSelected ? 'not-allowed' : 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={wholeChapterSelected || selected}
                                        disabled={wholeChapterSelected}
                                        onChange={() => toggleLesson({ chapterName: chapter.name, lessonName })}
                                      />
                                      {lessonName}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </fieldset>
                        );
                      })}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    Selecting a chapter includes all its lessons. Otherwise choose individual lessons.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">How long should access stay open?</label>
                  <select
                    value={form.chapterDuration}
                    onChange={e => setForm(p => ({ ...p, chapterDuration: e.target.value as 'permanent' | 'limited', durationDays: '' }))}
                    className="form-input"
                    style={{ appearance: 'auto' }}
                  >
                    <option value="permanent">Forever</option>
                    <option value="limited">For a specific duration</option>
                  </select>
                  {form.chapterDuration === 'limited' && (
                    <div style={{ marginTop: 8 }}>
                      <label className="form-label" htmlFor="chapter-access-days">Access duration (days)</label>
                      <input
                        id="chapter-access-days"
                        type="number"
                        min={1}
                        max={3650}
                        required
                        value={form.durationDays}
                        onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))}
                        className="form-input"
                        placeholder="Enter number of days (1–3650)"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Code window expiry */}
            <div className="form-group">
              <label className="form-label">Redeem code by <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input type="date" value={form.codeExpiresAt} onChange={e => setForm(p => ({ ...p, codeExpiresAt: e.target.value }))} className="form-input" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                The student must redeem the code by this date. It does not set how long the selected chapters stay open; that duration starts when the code is redeemed.
              </p>
            </div>

            {/* Code format */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-light)', marginBottom: 10 }}>Code format</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: 12 }}>Min length</label><input type="number" min={4} max={64} value={form.minLength} onChange={e => setForm(p => ({ ...p, minLength: e.target.value }))} className="form-input" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: 12 }}>Max length</label><input type="number" min={4} max={64} value={form.maxLength} onChange={e => setForm(p => ({ ...p, maxLength: e.target.value }))} className="form-input" /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.includeLetters} onChange={e => setForm(p => ({ ...p, includeLetters: e.target.checked }))} />
                Use letters (otherwise digits only)
              </label>
            </div>

            <button onClick={generate} disabled={generating} className="btn btn-primary">
              {generating ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</> : <><Key size={14} /> Generate Codes</>}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Quick Stats</h3>
          {[
            { label: 'Total', value: total, icon: Key, color: 'var(--primary-light)' },
            { label: 'Used', value: codes.filter(c => c.isUsed).length, icon: CheckCircle, color: 'var(--success)' },
            { label: 'Available', value: codes.filter(c => !c.isUsed).length, icon: Clock, color: 'var(--warning)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <s.icon size={16} style={{ color: s.color }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</span>
            </div>
          ))}

          {/* Code type legend */}
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Code Types</div>
            {(Object.entries(CODE_TYPE_META) as [CodeType, typeof CODE_TYPE_META[CodeType]][]).map(([type, meta]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <meta.Icon size={15} style={{ color: meta.color, marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {lastGenerated.length > 0 && (
        <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong>{lastGenerated.length} new codes ready</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Download a printable copy for distribution.</div>
          </div>
          <button onClick={exportWord} className="btn btn-secondary"><FileDown size={14} /> Word file</button>
          <button onClick={printPdf} className="btn btn-primary"><Printer size={14} /> Print / Save PDF</button>
        </div>
      )}

      {/* Teacher usage */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <BarChart3 size={17} style={{ color: 'var(--primary-light)' }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Teacher code usage</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>Used codes grouped by teacher for the selected month.</p>
          </div>
          <input type="month" value={usageMonth} onChange={e => setUsageMonth(e.target.value)} className="form-input" style={{ width: 160 }} />
          <span className="badge badge-active">{usageTotal.toLocaleString()} used</span>
        </div>
        {teacherUsage.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>No used codes recorded for this month.</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
              {teacherUsage.map(t => (
                <div key={t.teacherName} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                  <GraduationCap size={16} style={{ color: 'var(--primary-light)' }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{t.teacherName}</span>
                  <strong>{t.usedCodes}</strong>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {ROLE_FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Course</th>
              <th>Teacher</th>
              <th>Group</th>
              <th>Status</th>
              <th>Used By</th>
              <th>Redemption Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No codes found</td></tr>
            ) : codes.map(c => {
              const typeMeta = CODE_TYPE_META[c.codeType as CodeType] ?? CODE_TYPE_META.timed;
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{c.code}</code>
                      <button onClick={() => copyCode(c.code)} className="icon-btn" style={{ width: 26, height: 26 }}><Copy size={12} /></button>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: `${typeMeta.color}22`, color: typeMeta.color, border: `1px solid ${typeMeta.color}44` }}>
                      <typeMeta.Icon size={11} />{typeMeta.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {c.courseName
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><GraduationCap size={12} style={{ color: 'var(--primary-light)' }} />{c.courseName}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13 }}>{c.teacherName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontSize: 13 }}>{c.groupName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    {c.isUsed
                      ? <span className="badge badge-answered">Used</span>
                      : <span className="badge badge-pending">Available</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{c.usedBy?.name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{c.expiresAt ? format(new Date(c.expiresAt), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    {!c.isUsed && (
                      <button onClick={() => revoke(c.id)} className="btn btn-danger btn-sm"><Trash2 size={12} /> Revoke</button>
                    )}
                  </td>
                </tr>
              );
            })}
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
    </AppShell>
  );
}
