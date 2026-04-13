'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi } from '@/lib/api';
import { TrendingUp, Users, HelpCircle, CheckCircle, Key, Percent } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      {label && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.overview().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppShell><div className="page-loader"><span className="spinner" /></div></AppShell>;
  if (!data) return <AppShell><div className="empty-state"><div className="empty-state-icon">❌</div><div className="empty-state-title">Failed to load analytics</div></div></AppShell>;

  const userDistribution = [
    { name: 'Students', value: data.users?.students || 0 },
    { name: 'Teachers', value: data.users?.teachers || 0 },
  ];

  const questionStatus = [
    { name: 'Pending', value: data.questions?.pending || 0 },
    { name: 'Answered', value: data.questions?.answered || 0 },
  ];

  const codeStats = [
    { name: 'Used', value: data.subscriptions?.usedCodes || 0 },
    { name: 'Available', value: data.subscriptions?.availableCodes || 0 },
  ];

  const responseRate = data.questions?.total
    ? Math.round((data.answers?.total / data.questions?.total) * 100)
    : 0;

  const kpis = [
    { label: 'Total Users', value: data.users?.total?.toLocaleString(), icon: Users, color: '#6366f1', sub: `${data.users?.students} students, ${data.users?.teachers} teachers` },
    { label: 'Questions', value: data.questions?.total?.toLocaleString(), icon: HelpCircle, color: '#8b5cf6', sub: `${data.questions?.pending} pending` },
    { label: 'Answers', value: data.answers?.total?.toLocaleString(), icon: CheckCircle, color: '#10b981', sub: `${responseRate}% response rate` },
    { label: 'Active Subs', value: data.subscriptions?.activeSubscriptions?.toLocaleString(), icon: Key, color: '#06b6d4', sub: `${data.subscriptions?.availableCodes} codes left` },
    { label: 'Response Rate', value: `${responseRate}%`, icon: Percent, color: '#f59e0b', sub: 'answers per question' },
    { label: 'Codes Total', value: data.subscriptions?.totalCodes?.toLocaleString(), icon: Key, color: '#ef4444', sub: `${data.subscriptions?.usedCodes} used` },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Analytics</h1>
          <p className="page-subtitle">Real-time overview — updated {new Date(data.generatedAt).toLocaleTimeString()}</p>
        </div>
        <button onClick={() => { setLoading(true); adminApi.overview().then(r => setData(r.data)).finally(() => setLoading(false)); }} className="btn btn-secondary btn-sm">
          ↻ Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <kpi.icon size={22} style={{ color: kpi.color }} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>{kpi.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{kpi.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>User Roles</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={userDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {userDistribution.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Question Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={questionStatus} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {questionStatus.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : '#10b981'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Code Usage</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={codeStats} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Summary Table */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Metrics Summary</h3>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'Total Users', value: data.users?.total, detail: `${data.users?.students} students + ${data.users?.teachers} teachers` },
                { metric: 'Total Questions', value: data.questions?.total, detail: `${data.questions?.pending} pending, ${data.questions?.answered} answered` },
                { metric: 'Total Answers', value: data.answers?.total, detail: `${responseRate}% of questions answered` },
                { metric: 'Active Subscriptions', value: data.subscriptions?.activeSubscriptions, detail: 'Currently active student subscriptions' },
                { metric: 'Total Codes Generated', value: data.subscriptions?.totalCodes, detail: `${data.subscriptions?.usedCodes} used, ${data.subscriptions?.availableCodes} available` },
              ].map(row => (
                <tr key={row.metric}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.metric}</td>
                  <td style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary-light)' }}>{row.value?.toLocaleString() ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
