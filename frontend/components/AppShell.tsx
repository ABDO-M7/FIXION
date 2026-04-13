'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore, useNotificationStore } from '@/store';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, HelpCircle, Bell, LogOut, Settings,
  Search, Menu, X, Globe, ChevronRight, BookOpen,
  Users, BarChart2, Key, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { authApi, notificationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';

const studentNav = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'My Questions', href: '/student/questions', icon: HelpCircle },
  { label: 'Subscription', href: '/student/subscription', icon: Key },
  { label: 'Notifications', href: '/student/notifications', icon: Bell },
];

const teacherNav = [
  { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
  { label: 'Questions', href: '/teacher/questions', icon: HelpCircle },
  { label: 'Categories', href: '/teacher/categories', icon: BookOpen },
  { label: 'Notifications', href: '/teacher/notifications', icon: Bell },
];

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Questions', href: '/admin/questions', icon: MessageSquare },
  { label: 'Codes', href: '/admin/codes', icon: Key },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
];

interface AppShellProps { children: React.ReactNode; }

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, locale, setLocale } = useUIStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();

  const nav = user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;

  // Connect WebSocket for real-time notifications
  useWebSocket();

  useEffect(() => {
    notificationsApi.unreadCount().then(r => setUnreadCount(r.data)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <div className={`app-layout ${!sidebarOpen ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">E</div>
          {sidebarOpen && <span className="logo-text">EduQ&amp;A</span>}
        </div>

        <nav className="sidebar-nav">
          {sidebarOpen && <span className="nav-section-label">Navigation</span>}
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/student' && item.href !== '/teacher' && item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initial}</div>
          {sidebarOpen && (
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={handleLogout} className="icon-btn" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn" onClick={toggleSidebar}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="topbar-search">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input placeholder="Search questions..." />
            </div>
          </div>

          <div className="topbar-actions">
            {/* Language Toggle */}
            <button
              className="icon-btn"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              title="Toggle Arabic/English"
            >
              <Globe size={18} />
            </button>

            <Link href={`/${user?.role}/notifications`} className="icon-btn">
              <Bell size={18} />
              {unreadCount > 0 && <span className="notification-dot" />}
            </Link>

            <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{initial}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
