'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { notificationsApi } from '@/lib/api';
import { useNotificationStore } from '@/store';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { resetUnread } = useNotificationStore();
  const LIMIT = 20;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list(page);
      setNotifications(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, [page]);

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
    } catch { toast.error('Failed to mark all read'); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    if (type === 'answer') return '💬';
    if (type === 'system') return '🔧';
    return '🔔';
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {total} total
            {unreadCount > 0 && <span style={{ color: 'var(--primary-light)', marginLeft: 8 }}>· {unreadCount} unread</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-secondary">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loader"><span className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">No notifications</div>
          <div className="empty-state-text">You'll be notified here when your questions get answered.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              style={{
                padding: '16px 20px',
                background: n.isRead ? 'var(--bg-card)' : 'rgba(99,102,241,0.05)',
                borderLeft: n.isRead ? 'none' : '3px solid var(--primary)',
                borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: n.isRead ? 'default' : 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}
              className={!n.isRead ? 'notification-item unread' : ''}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: n.isRead ? 'var(--bg-elevated)' : 'rgba(99,102,241,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {getIcon(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {n.title && (
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: 'var(--text-primary)' }}>
                    {n.title}
                  </div>
                )}
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                  {!n.isRead && (
                    <span style={{ fontSize: 10, background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>NEW</span>
                  )}
                </div>
              </div>
              {!n.isRead && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>
      )}

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
