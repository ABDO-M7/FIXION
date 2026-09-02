'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore, useUIStore, useNotificationStore } from '@/store';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, HelpCircle, Bell, LogOut,
  Search, Menu, X, Globe, BookOpen, User,
  Users, BarChart2, Key, MessageSquare, GraduationCap, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { authApi, notificationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';

const studentNav = [
  { key: 'nav.dashboard',      href: '/student',                icon: LayoutDashboard },
  { key: 'nav.questions',      href: '/student/questions',      icon: HelpCircle },
  { key: 'nav.courses',        href: '/student/courses',        icon: GraduationCap },
  { key: 'nav.appointments',   href: '/student/appointments',   icon: Calendar },
  { key: 'nav.subscription',   href: '/student/subscription',   icon: Key },
  { key: 'nav.profile',        href: '/student/profile',        icon: User },
  { key: 'nav.notifications',  href: '/student/notifications',  icon: Bell },
];

const teacherNav = [
  { key: 'nav.dashboard',      href: '/teacher',                icon: LayoutDashboard },
  { key: 'nav.courses',        href: '/teacher/courses',        icon: GraduationCap },
  { key: 'nav.appointments',   href: '/teacher/appointments',   icon: Calendar },
  { key: 'nav.allQuestions',   href: '/teacher/questions',      icon: HelpCircle },
  { key: 'nav.categories',     href: '/teacher/categories',     icon: BookOpen },
  { key: 'nav.profile',        href: '/teacher/profile',        icon: User },
  { key: 'nav.notifications',  href: '/teacher/notifications',  icon: Bell },
];

const adminNav = [
  { key: 'nav.dashboard',    href: '/admin',            icon: LayoutDashboard },
  { key: 'nav.users',        href: '/admin/users',      icon: Users },
  { key: 'nav.allQuestions', href: '/admin/questions',  icon: MessageSquare },
  { key: 'nav.codes',        href: '/admin/codes',      icon: Key },
  { key: 'nav.analytics',    href: '/admin/analytics',  icon: BarChart2 },
];

interface AppShellProps { children: React.ReactNode; }

export default function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, locale, setLocale, setSidebarOpen } = useUIStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const nav = user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;

  useWebSocket();

  useEffect(() => {
    notificationsApi.unreadCount().then(r => setUnreadCount(r.data)).catch(() => {});
    
    // Auto-collapse sidebar on mobile devices
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Enforce onboarding for Google OAuth users missing phone/level
  useEffect(() => {
    if (user && pathname !== '/onboarding') {
      const missingData = !user.phone || (user.role === 'student' && !user.level);
      if (missingData) {
        router.push('/onboarding');
      }
    }
  }, [user, pathname, router]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    router.push('/login');
    toast.success(t('common.logout'));
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
          {sidebarOpen && <span className="nav-section-label">{t('nav.navigation')}</span>}

          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
                title={!sidebarOpen ? t(item.key) : undefined}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span style={{ flex: 1 }}>{t(item.key)}</span>}
                {sidebarOpen && item.key === 'nav.notifications' && unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="sidebar-user">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="user-avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="user-avatar">{initial}</div>
          )}
          {sidebarOpen && (
            <>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role ? t(`roles.${user.role}`) : ''}</div>
              </div>
              <button
                onClick={handleLogout}
                className="icon-btn"
                title={t('common.logout')}
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
              title={sidebarOpen ? t('common.collapseSidebar') : t('common.expandSidebar')}
            >
              {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>

            <div className="topbar-search">
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input placeholder={t('common.search')} />
            </div>
          </div>

          <div className="topbar-actions">
            {/* Language Toggle */}
            <button
              className="icon-btn"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              title={t('common.toggleLanguage')}
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
            <Link href={`/${user?.role}/profile`} title="Profile">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="user-avatar" style={{ width: 32, height: 32, objectFit: 'cover' }} />
              ) : (
                <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {initial}
                </div>
              )}
            </Link>
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
