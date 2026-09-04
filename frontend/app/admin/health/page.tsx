'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi } from '@/lib/api';
import { Activity, Database, HardDrive, Mail, Key, Globe, RefreshCcw, Server, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminHealthDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (showToast = false) => {
    try {
      setRefreshing(true);
      const res = await adminApi.health();
      setData(res.data);
      if (showToast) toast.success('Health status updated');
    } catch (err) {
      toast.error('Failed to fetch health status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <AppShell><div className="page-loader"><span className="spinner" /></div></AppShell>;
  if (!data) return <AppShell><div className="empty-state">No health data available</div></AppShell>;

  const getStatusColor = (status: string) => {
    if (status === 'up' || status === 'healthy') return 'var(--success)';
    if (status === 'degraded' || status === 'not_configured') return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <AppShell>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 className="page-title" style={{ margin: 0 }}>System Health</h1>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 6, 
              background: 'var(--bg-elevated)', padding: '4px 12px', 
              borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid var(--border)'
            }}>
              <span style={{ 
                width: 8, height: 8, borderRadius: '50%', 
                background: getStatusColor(data.status),
                boxShadow: `0 0 10px ${getStatusColor(data.status)}`
              }} />
              <span style={{ textTransform: 'capitalize', color: getStatusColor(data.status) }}>{data.status}</span>
            </div>
          </div>
          <p className="page-subtitle">Real-time infrastructure and service monitoring</p>
        </div>
        
        <button 
          onClick={() => fetchHealth(true)} 
          disabled={refreshing}
          className="btn btn-secondary"
          style={{ gap: 8 }}
        >
          <RefreshCcw size={16} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Checking...' : 'Refresh Now'}
        </button>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Last checked: {new Date(data.timestamp).toLocaleTimeString()}
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        {/* Database */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: getStatusColor(data.checks.database?.status) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <Database size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Database</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.checks.database?.provider}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: getStatusColor(data.checks.database?.status), textTransform: 'uppercase' }}>
              {data.checks.database?.status}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 'auto' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Latency</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{data.checks.database?.latency || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Connections</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{data.checks.database?.activeConnections || 0}</div>
            </div>
          </div>
          
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Storage Used</span>
              <span style={{ fontWeight: 600 }}>{data.checks.database?.size} / {data.checks.database?.maxSize}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(data.checks.database?.usagePercent || 0, 100)}%`, height: '100%', background: '#3b82f6', borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* R2 Storage */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: getStatusColor(data.checks.storage?.status) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <HardDrive size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Storage</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.checks.storage?.provider}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: getStatusColor(data.checks.storage?.status), textTransform: 'uppercase' }}>
              {data.checks.storage?.status}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 'auto' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Latency</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{data.checks.storage?.latency || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Objects</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{data.checks.storage?.objectCount?.toLocaleString() || 0}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Storage Used</span>
              <span style={{ fontWeight: 600 }}>{data.checks.storage?.size} / {data.checks.storage?.maxSize}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(data.checks.storage?.usagePercent || 0, 100)}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* WebSockets */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: getStatusColor(data.checks.websocket?.status) }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Globe size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Real-time</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.checks.websocket?.provider}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: getStatusColor(data.checks.websocket?.status), textTransform: 'uppercase' }}>
              {data.checks.websocket?.status}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 'auto' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Active Connections</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{data.checks.websocket?.connections || 0}</div>
            </div>
          </div>
          
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} /> WebSocket namespace: {data.checks.websocket?.namespace}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Third Party Integrations */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Integrations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{data.checks.email?.provider}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sender: {data.checks.email?.fromEmail}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(data.checks.email?.status), padding: '4px 10px', background: `color-mix(in srgb, ${getStatusColor(data.checks.email?.status)} 15%, transparent)`, borderRadius: 20 }}>
                {data.checks.email?.configured ? 'Configured' : 'Missing Keys'}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                  <Key size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{data.checks.oauth?.provider}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>OAuth2 Provider</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(data.checks.oauth?.status), padding: '4px 10px', background: `color-mix(in srgb, ${getStatusColor(data.checks.oauth?.status)} 15%, transparent)`, borderRadius: 20 }}>
                {data.checks.oauth?.configured ? 'Configured' : 'Missing Keys'}
              </div>
            </div>
          </div>
        </div>

        {/* Server Metrics */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Server Node Info</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Server size={18} style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Uptime</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{data.server?.uptimeFormatted}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Cpu size={18} style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Memory (RSS)</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{data.server?.memory?.rss}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Activity size={18} style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Heap Used</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{data.server?.memory?.heapUsed} / {data.server?.memory?.heapTotal}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Globe size={18} style={{ color: 'var(--text-muted)' }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Environment</span>
                <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{data.server?.environment}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
