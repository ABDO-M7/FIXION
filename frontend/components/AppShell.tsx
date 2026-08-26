'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore, useNotificationStore } from '@/store';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, HelpCircle, Bell, LogOut,
  Search, Menu, X, Globe, BookOpen,
  Users, BarChart2, Key, MessageSquare, GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { authApi, notificationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';

const studentNav = [
  { label: 'Dashboard',      href: '/student',                icon: LayoutDashboard },
  { label: 'My Questions',   href: '/student/questions',      icon: HelpCircle },
  { label: 'Courses',        href: '/student/courses',        icon: GraduationCap },
  { label: 'Subscription',   href: '/student/subscription',   icon: Key },
  { label: 'Notifications',  href: '/student/notifications',  icon: Bell },
];

const teacherNav = [
  { label: 'Dashboard',      href: '/teacher',                icon: LayoutDashboard },
  { label: 'Courses',        href: '/teacher/courses',        icon: GraduationCap },
  { label: 'Questions',      href: '/teacher/questions',      icon: HelpCircle },
  { label: 'Categories',     href: '/teacher/categories',     icon: BookOpen },
  { label: 'Notifications',  href: '/teacher/notifications',  icon: Bell },
];

const adminNav = [
  { label: 'Dashboard',  href: '/admin',            icon: LayoutDashboard },
  { label: 'Users',      href: '/admin/users',      icon: Users },
  { label: 'Questions',  href: '/admin/questions',  icon: MessageSquare },
  { label: 'Codes',      href: '/admin/codes',      icon: Key },
  { label: 'Analytics',  href: '/admin/analytics',  icon: BarChart2 },
];

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin:   'Admin',
};

interface AppShellProps { children: React.ReactNode; }

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, locale, setLocale, setSidebarOpen } = useUIStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();

  const nav = user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;

  useWebSocket();

  useEffect(() => {
    notificationsApi.unreadCount().then(r => setUnreadCount(r.data)).catch(() => {});
    
    // Auto-collapse sidebar on mobile devices
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    router.push('/login');
    toast.success('Logged out');
  };

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  const isActive = (href: string) =>
    href === '/student' || href === '/teacher' || href === '/admin'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <div className={`app-layout ${!sidebarOpen ? 'collapsed' : ''}`}>
      {/* ── Mobile Sidebar Overlay ───────────────────────────────── */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
      />

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <Image
            src="/logo.png"
            alt="Fixion"
            width={32} height={32}
            style={{ borderRadius: 8, flexShrink: 0 }}
          />
          {sidebarOpen && <span className="logo-text">Fixion</span>}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sidebarOpen && <span className="nav-section-label">Navigation</span>}

          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                {sidebarOpen && item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="sidebar-user">
          <div className="user-avatar">{initial}</div>
          {sidebarOpen && (
            <>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{ROLE_LABELS[user?.role || ''] || user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="icon-btn"
                title="Logout"
                style={{ color: 'var(--text-muted)', width: 32, height: 32 }}
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="icon-btn"
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>

            <div className="topbar-search">
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input placeholder="Search…" />
            </div>
          </div>

          <div className="topbar-actions">
            {/* Language Toggle */}
            <button
              className="icon-btn"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              title="Toggle Arabic/English"
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}
            >
              <Globe size={16} />
            </button>

            {/* Notifications */}
            <Link href={`/${user?.role}/notifications`} className="icon-btn" style={{ position: 'relative' }}>
              <Bell size={17} />
              {unreadCount > 0 && <span className="notification-dot" />}
            </Link>

            {/* Avatar */}
            <div
              className="user-avatar"
              style={{ width: 32, height: 32, fontSize: 12, cursor: 'default' }}
              title={user?.name}
            >
              {initial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
