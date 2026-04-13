'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { codesApi } from '@/lib/api';
import { Key, Copy, Trash2, Search, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ plan: 'monthly', quantity: '10', expiresAt: '' });
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

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await codesApi.generate(form.plan, +form.quantity, form.expiresAt || undefined);
      toast.success(`${res.data.length} codes generated!`);
      fetchCodes();
    } catch { toast.error('Failed to generate codes'); } finally { setGenerating(false); }
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
            <div className="form-group">
              <label className="form-label">Code Expiry (optional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className="form-input" />
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
              <th>Status</th>
              <th>Used By</th>
              <th>Used At</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No codes found</td></tr>
            ) : codes.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{c.code}</code>
                    <button onClick={() => copyCode(c.code)} className="icon-btn" style={{ width: 26, height: 26 }}><Copy size={12} /></button>
                  </div>
                </td>
                <td><span className={`badge ${c.plan === 'monthly' ? 'badge-active' : 'badge-pending'}`} style={{ textTransform: 'capitalize' }}>{c.plan}</span></td>
                <td>
                  {c.isUsed
                    ? <span className="badge badge-answered">Used</span>
                    : <span className="badge badge-pending">Available</span>}
                </td>
                <td style={{ fontSize: 12 }}>{c.usedBy?.name || '—'}</td>
                <td style={{ fontSize: 12 }}>{c.usedAt ? format(new Date(c.usedAt), 'MMM d, yyyy') : '—'}</td>
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
