'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { notificationsApi } from '@/lib/api';
import { useNotificationStore } from '@/store';
import { CheckCheck, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// Teacher reuses same notifications page layout
export default function TeacherNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { resetUnread } = useNotificationStore();
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    notificationsApi.list(page).then(r => {
      setNotifications(r.data.data || []);
      setTotal(r.data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetUnread();
      toast.success('All notifications marked as read');
    } catch {}
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{total} total{unread > 0 && <span style={{ color: 'var(--primary-light)', marginLeft: 8 }}>· {unread} unread</span>}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary"><CheckCheck size={15} /> Mark all read</button>
        )}
      </div>

      {loading ? (
        <div className="page-loader"><span className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">No notifications</div>
          <div className="empty-state-text">System notifications will appear here.</div>
        </div>
      ) : (
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {notifications.map((n, i) => (
            <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
              style={{
                padding: '16px 20px', cursor: n.isRead ? 'default' : 'pointer',
                background: n.isRead ? 'var(--bg-card)' : 'rgba(99,102,241,0.05)',
                borderLeft: n.isRead ? 'none' : '3px solid var(--primary)',
                borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'var(--transition)',
              }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: n.isRead ? 'var(--bg-elevated)' : 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {n.type === 'answer' ? '💬' : '🔔'}
              </div>
              <div style={{ flex: 1 }}>
                {n.title && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{n.title}</div>}
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                  {!n.isRead && <span style={{ fontSize: 10, background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>NEW</span>}
                </div>
              </div>
              {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
