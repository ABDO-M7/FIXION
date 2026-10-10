'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi, codesApi, assignmentsApi } from '@/lib/api';
import { Key, Copy, Trash2, CheckCircle, Clock, GraduationCap, FileDown, Printer, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
  const [teachers, setTeachers] = useState<{ id: string; name: string; email: string; subjects?: string[] }[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>(['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه']);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [customGroup, setCustomGroup] = useState(false);
  const [form, setForm] = useState({
    plan: 'monthly',
    quantity: '10',
    expiresAt: '',
    courseName: '',
    teacherId: '',
    groupName: '',
    minLength: '16',
    maxLength: '16',
    includeLetters: true,
  });
  const LIMIT = 50;

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
        const set = new Set([...fallback, ...list]);
        setAvailableCourses(Array.from(set));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.courseName) {
      setAvailableGroups([]);
      setForm(p => ({ ...p, groupName: '' }));
      setCustomGroup(false);
      return;
    }
    setLoadingGroups(true);
    assignmentsApi.groupsDetailed(form.courseName)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        const groupNames = list.map((g: any) => typeof g === 'string' ? g : g.groupName).filter(Boolean);
        const resolvedGroups = groupNames.length > 0 ? groupNames : ['Group 1'];
        setAvailableGroups(resolvedGroups);
        setCustomGroup(false);
        setForm(p => {
          const nextGroup = p.groupName && resolvedGroups.includes(p.groupName) ? p.groupName : (resolvedGroups[0] || '');
          const matchedGroup = list.find((g: any) => g.groupName === nextGroup);
          const nextTeacherId = (!p.teacherId && matchedGroup?.teacherId) ? matchedGroup.teacherId : p.teacherId;
          return { ...p, groupName: nextGroup, teacherId: nextTeacherId || p.teacherId };
        });
      })
      .catch(() => {
        assignmentsApi.groups(form.courseName)
          .then(res => {
            const list = Array.isArray(res.data) ? res.data : [];
            const resolvedGroups = list.length > 0 ? list : ['Group 1'];
            setAvailableGroups(resolvedGroups);
            setCustomGroup(false);
            setForm(p => ({
              ...p,
              groupName: p.groupName && resolvedGroups.includes(p.groupName) ? p.groupName : (resolvedGroups[0] || ''),
            }));
          })
          .catch(() => setAvailableGroups([]));
      })
      .finally(() => setLoadingGroups(false));
  }, [form.courseName]);


  const generate = async () => {
    const quantity = Number(form.quantity);
    const minLength = Number(form.minLength);
    const maxLength = Number(form.maxLength);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) { toast.error('Quantity must be between 1 and 500'); return; }
    if (!Number.isInteger(minLength) || !Number.isInteger(maxLength) || minLength < 4 || maxLength > 64 || minLength > maxLength) { toast.error('Length must be between 4 and 64, with minimum no greater than maximum'); return; }
    if (form.courseName.trim() && !form.teacherId) { toast.error('Select a teacher for this course'); return; }
    if (form.teacherId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.teacherId)) {
      toast.error('Please select a valid teacher');
      return;
    }
    setGenerating(true);
    try {
      const res = await codesApi.generate(
        form.plan,
        quantity,
        form.expiresAt || undefined,
        form.courseName || undefined,
        form.teacherId || undefined,
        form.groupName || undefined,
        minLength,
        maxLength,
        form.includeLetters,
      );
      const generated = Array.isArray(res.data) ? res.data : [];
      setLastGenerated(generated);
      toast.success(`${generated.length} codes generated!`);
      fetchCodes();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Failed to generate codes'); } finally { setGenerating(false); }
  };

  const exportWord = () => {
    if (!lastGenerated.length) return;
    const rows = lastGenerated.map(code => `<tr><td>${code.code}</td><td>${code.plan}</td><td>${code.expiresAt ? format(new Date(code.expiresAt), 'MMM d, yyyy') : 'No expiry'}</td></tr>`).join('');
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:left}code{font-family:monospace;font-size:16px;letter-spacing:1px}</style></head><body><h1>FIXION Subscription Codes</h1><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Code</th><th>Plan</th><th>Expires</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `fixion-codes-${new Date().toISOString().slice(0, 10)}.doc`; link.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    if (!lastGenerated.length) return;
    const rows = lastGenerated.map(code => `<div class="code"><strong>${code.code}</strong><span>${code.plan}${code.expiresAt ? ` · ${format(new Date(code.expiresAt), 'MMM d, yyyy')}` : ''}</span></div>`).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>FIXION Subscription Codes</title><style>body{font-family:Arial;padding:28px;color:#111}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.code{border:1px solid #bbb;border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:8px}.code strong{font:700 20px monospace;letter-spacing:1px}.code span{font-size:12px;color:#555}@media print{button{display:none}}</style></head><body><h1>FIXION Subscription Codes</h1><p>Generated: ${new Date().toLocaleString()}</p><div class="grid">${rows}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} className="form-input" style={{ appearance: 'auto' }}>
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity (max 500)</label>
                <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className="form-input" min={1} max={500} />
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-light)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={13} /> Course Info (optional)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Course Name</label>
                  <select
                    value={form.courseName}
                    onChange={e => setForm(p => ({ ...p, courseName: e.target.value }))}
                    className="form-input"
                    style={{ appearance: 'auto', fontSize: 13 }}
                  >
                    <option value="">— No course (subscription only) —</option>
                    {availableCourses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Teacher Name</label>
                    <select
                      value={form.teacherId}
                      onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}
                      className="form-input"
                      style={{ fontSize: 13 }}
                      aria-label="Teacher"
                    >
                      <option value="">— No teacher —</option>
                      {teachers
                        .filter(teacher => !form.courseName || !teacher.subjects?.length || teacher.subjects.includes(form.courseName) || teacher.id === form.teacherId)
                        .map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 0 }}>Group Name</label>
                      {form.courseName && availableGroups.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomGroup(!customGroup)}
                          className="btn-link"
                          style={{ fontSize: 11, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {customGroup ? 'Pick from list' : '+ Custom'}
                        </button>
                      )}
                    </div>
                    {loadingGroups ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Loading groups...
                      </div>
                    ) : customGroup ? (
                      <input
                        value={form.groupName}
                        onChange={e => setForm(p => ({ ...p, groupName: e.target.value }))}
                        className="form-input"
                        placeholder="e.g. Group A"
                        style={{ fontSize: 13 }}
                      />
                    ) : (
                      <select
                        value={form.groupName}
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setCustomGroup(true);
                            setForm(p => ({ ...p, groupName: '' }));
                          } else {
                            setForm(p => ({ ...p, groupName: e.target.value }));
                          }
                        }}
                        className="form-input"
                        style={{ fontSize: 13, appearance: 'auto' }}
                        disabled={!form.courseName}
                      >
                        {!form.courseName ? (
                          <option value="">— Select course first —</option>
                        ) : (
                          <>
                            <option value="">— No group —</option>
                            {availableGroups.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="__custom__">+ Enter custom group...</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Code Expiry (optional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className="form-input" />
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-light)', marginBottom: 10 }}>Code format</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: 12 }}>Minimum length</label><input type="number" min={4} max={64} value={form.minLength} onChange={e => setForm(p => ({ ...p, minLength: e.target.value }))} className="form-input" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: 12 }}>Maximum length</label><input type="number" min={4} max={64} value={form.maxLength} onChange={e => setForm(p => ({ ...p, maxLength: e.target.value }))} className="form-input" /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}><input type="checkbox" checked={form.includeLetters} onChange={e => setForm(p => ({ ...p, includeLetters: e.target.checked }))} /> Use letters (otherwise digits only)</label>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 7 }}>Each generated code gets a random length between these values.</div>
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
        </div>
      </div>

      {lastGenerated.length > 0 && (
        <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}><strong>{lastGenerated.length} new codes ready</strong><div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Download a printable copy for distribution.</div></div>
          <button onClick={exportWord} className="btn btn-secondary"><FileDown size={14} /> Word file</button>
          <button onClick={printPdf} className="btn btn-primary"><Printer size={14} /> Print / Save PDF</button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <BarChart3 size={17} style={{ color: 'var(--primary-light)' }} />
          <div style={{ flex: 1 }}><h3 style={{ fontSize: 14, fontWeight: 700 }}>Teacher code usage</h3><p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>Used subscription codes grouped by teacher for the selected month.</p></div>
          <input type="month" value={usageMonth} onChange={event => setUsageMonth(event.target.value)} className="form-input" style={{ width: 160 }} />
          <span className="badge badge-active">{usageTotal.toLocaleString()} used</span>
        </div>
        {teacherUsage.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>No used codes recorded for this month.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {teacherUsage.map(teacher => <div key={teacher.teacherName} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}><GraduationCap size={16} style={{ color: 'var(--primary-light)' }} /><span style={{ flex: 1, fontSize: 13 }}>{teacher.teacherName}</span><strong>{teacher.usedCodes}</strong></div>)}
          </div>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'unused', 'used'] as const).map(f => (
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
              <th>Plan</th>
              <th>Course</th>
              <th>Teacher</th>
              <th>Group</th>
              <th>Status</th>
              <th>Used By</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No codes found</td></tr>
            ) : codes.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{c.code}</code>
                    <button onClick={() => copyCode(c.code)} className="icon-btn" style={{ width: 26, height: 26 }}><Copy size={12} /></button>
                  </div>
                </td>
                <td><span className={`badge ${c.plan === 'monthly' ? 'badge-active' : 'badge-pending'}`} style={{ textTransform: 'capitalize' }}>{c.plan}</span></td>
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
    </AppShell>
  );
}
