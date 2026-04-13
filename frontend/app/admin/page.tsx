'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi, codesApi } from '@/lib/api';
import { Users, HelpCircle, CheckCircle, Key, BarChart2, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [codeForm, setCodeForm] = useState({ plan: 'monthly', quantity: 10 });

  useEffect(() => {
    adminApi.overview().then(r => setOverview(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const generateCodes = async () => {
    setGeneratingCodes(true);
    try {
      const res = await codesApi.generate(codeForm.plan, +codeForm.quantity);
      toast.success(`${res.data.length} codes generated!`);
      adminApi.overview().then(r => setOverview(r.data));
    } catch {
      toast.error('Failed to generate codes');
    } finally { setGeneratingCodes(false); }
  };

  const pieData = overview ? [
    { name: 'Students', value: overview.users?.students || 0 },
    { name: 'Teachers', value: overview.users?.teachers || 0 },
  ] : [];

  const questionData = overview ? [
    { name: 'Pending', value: overview.questions?.pending || 0, fill: '#f59e0b' },
    { name: 'Answered', value: overview.questions?.answered || 0, fill: '#10b981' },
  ] : [];

  if (loading) return <AppShell><div className="page-loader"><span className="spinner" /></div></AppShell>;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview & management</p>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          Last updated: {new Date(overview?.generatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}><Users size={20} style={{ color: 'var(--primary-light)' }} /></div>
          <div className="stat-value">{overview?.users?.total?.toLocaleString()}</div>
          <div className="stat-label">Total Users</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {overview?.users?.students} students · {overview?.users?.teachers} teachers
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><HelpCircle size={20} style={{ color: 'var(--secondary)' }} /></div>
          <div className="stat-value">{overview?.questions?.total?.toLocaleString()}</div>
          <div className="stat-label">Total Questions</div>
          <div style={{ fontSize: 11, color: 'var(--warning)' }}>{overview?.questions?.pending} pending</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CheckCircle size={20} style={{ color: 'var(--success)' }} /></div>
          <div className="stat-value">{overview?.answers?.total?.toLocaleString()}</div>
          <div className="stat-label">Total Answers</div>
          <div style={{ fontSize: 11, color: 'var(--success)' }}>
            {overview?.questions?.total ? Math.round((overview.answers.total / overview.questions.total) * 100) : 0}% response rate
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}><Key size={20} style={{ color: 'var(--accent)' }} /></div>
          <div className="stat-value">{overview?.subscriptions?.activeSubscriptions?.toLocaleString()}</div>
          <div className="stat-label">Active Subscriptions</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {overview?.subscriptions?.availableCodes} codes available
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>User Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Questions Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={questionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {questionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-2">
        {/* Generate Codes */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Generate Subscription Codes</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Batch-generate prepaid codes to distribute to students.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select
                  value={codeForm.plan}
                  onChange={e => setCodeForm(prev => ({ ...prev, plan: e.target.value }))}
                  className="form-input"
                  style={{ appearance: 'auto' }}
                >
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  value={codeForm.quantity}
                  onChange={e => setCodeForm(prev => ({ ...prev, quantity: +e.target.value }))}
                  className="form-input"
                  min={1} max={500} placeholder="10"
                />
              </div>
            </div>
            <button onClick={generateCodes} disabled={generatingCodes} className="btn btn-primary">
              {generatingCodes
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
                : <><Key size={15} /> Generate {codeForm.quantity} Codes</>}
            </button>
          </div>
        </div>

        {/* Code Stats */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Subscription Codes Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Codes Generated', value: overview?.subscriptions?.totalCodes || 0, color: 'var(--primary-light)' },
              { label: 'Codes Used', value: overview?.subscriptions?.usedCodes || 0, color: 'var(--success)' },
              { label: 'Available Codes', value: overview?.subscriptions?.availableCodes || 0, color: 'var(--warning)' },
              { label: 'Active Subscriptions', value: overview?.subscriptions?.activeSubscriptions || 0, color: 'var(--accent)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color, fontSize: 16 }}>{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
