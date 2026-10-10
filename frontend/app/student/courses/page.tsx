'use client';

import { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import { enrollmentsApi } from '@/lib/api';
import {
  GraduationCap, User, Users, ChevronRight, Calendar,
  Key, Search, BookOpen, Sparkles, ArrowRight, Clock
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/hooks/useTranslation';

const COURSE_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  'فيزيا':  { primary: '#6366f1', secondary: '#818cf8', glow: 'rgba(99,102,241,0.18)' },
  'رياضه':  { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16,185,129,0.18)' },
  'احصاء':  { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245,158,11,0.18)' },
  'عربي':   { primary: '#ef4444', secondary: '#f87171', glow: 'rgba(239,68,68,0.18)' },
  'برمجه':  { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139,92,246,0.18)' },
};

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    enrollmentsApi.my()
      .then(r => setEnrollments(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredEnrollments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter(e => {
      const cName = (e.courseName || '').toLowerCase();
      const tName = (e.teacher?.name || e.teacherName || '').toLowerCase();
      const gName = (e.groupName || '').toLowerCase();
      return cName.includes(q) || tName.includes(q) || gName.includes(q);
    });
  }, [enrollments, search]);

  return (
    <AppShell>
      {/* Hero / Page Header */}
      <div style={{
        marginBottom: 28,
        padding: '24px 28px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.85) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient background glow */}
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, flexWrap: 'wrap', position: 'relative', zIndex: 1,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                textTransform: 'uppercase', padding: '3px 10px',
                borderRadius: 99, background: 'rgba(99,102,241,0.15)',
                color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.25)',
              }}>
                <GraduationCap size={13} /> Learning Hub
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {enrollments.length} {enrollments.length === 1 ? 'Course Enrolled' : 'Courses Enrolled'}
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800,
              color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em',
            }}>
              {t('courses.title')}
            </h1>
            <p style={{
              color: 'var(--text-secondary)', fontSize: 14, margin: '6px 0 0',
              maxWidth: 580, lineHeight: 1.5,
            }}>
              تابع دروسك، حصصك المسجلة، واجباتك واختباراتك لجميع المواد المشترك بها في منصة FIXION.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/student/subscription"
              className="btn btn-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              <Key size={15} />
              <span>{t('courses.redeemCode')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      {enrollments.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 14, marginBottom: 22, flexWrap: 'wrap',
        }}>
          <div style={{
            position: 'relative', flex: 1, minWidth: 260, maxWidth: 420,
          }}>
            <Search size={15} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)',
            }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن مادة أو مدرس..."
              className="form-input"
              style={{ paddingLeft: 36, fontSize: 13, height: 38 }}
            />
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            عرض <strong>{filteredEnrollments.length}</strong> من إجمالي <strong>{enrollments.length}</strong>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 34, height: 34, borderWidth: 3 }} />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center', padding: '64px 24px', maxWidth: 520, margin: '20px auto',
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          borderRadius: 20,
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', margin: '0 auto 18px',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            display: 'grid', placeItems: 'center', color: 'var(--primary-light)',
          }}>
            <BookOpen size={30} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>
            {t('courses.noCourses')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {t('courses.noCoursesText')}
          </p>
          <Link
            href="/student/subscription"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontWeight: 700 }}
          >
            <Key size={15} />
            <span>{t('courses.redeemCode')}</span>
          </Link>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 14 }}>لا توجد مواد تطابق البحث الحالي "{search}"</p>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 20 }}>
          {filteredEnrollments.map((enrollment: any) => {
            const courseTheme = COURSE_COLORS[enrollment.courseName] || {
              primary: '#6366f1', secondary: '#818cf8', glow: 'rgba(99,102,241,0.18)',
            };
            const teacherName = enrollment.teacher?.name || enrollment.teacherName || 'مدرس المادة';
            const groupName = enrollment.groupName || 'المجموعة الأساسية';

            return (
              <Link
                key={enrollment.id}
                href={`/student/courses/${enrollment.id}`}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 16,
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  overflow: 'hidden',
                  padding: 0,
                  position: 'relative',
                  background: 'linear-gradient(180deg, rgba(24,24,27,0.85) 0%, rgba(18,18,21,0.95) 100%)',
                }}
                onMouseEnter={e => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.transform = 'translateY(-3px)';
                  target.style.borderColor = `${courseTheme.primary}66`;
                  target.style.boxShadow = `0 14px 32px -8px ${courseTheme.glow}, 0 4px 12px rgba(0,0,0,0.3)`;
                }}
                onMouseLeave={e => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.transform = 'none';
                  target.style.borderColor = 'rgba(255,255,255,0.08)';
                  target.style.boxShadow = 'none';
                }}
              >
                {/* Visual Top Header Strip with Ambient Glow */}
                <div style={{
                  padding: '20px 22px 16px',
                  background: `linear-gradient(135deg, ${courseTheme.primary}18 0%, transparent 80%)`,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: `linear-gradient(135deg, ${courseTheme.primary}33, ${courseTheme.primary}11)`,
                      border: `1px solid ${courseTheme.primary}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <GraduationCap size={22} style={{ color: courseTheme.secondary }} />
                    </div>

                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.04)', padding: '3px 9px',
                      borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(enrollment.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
                    margin: 0, letterSpacing: '-0.02em',
                  }}>
                    {enrollment.courseName}
                  </h3>
                </div>

                {/* Card Body with Teacher & Group Pills */}
                <div style={{ padding: '18px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `${courseTheme.primary}22`,
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      color: courseTheme.secondary,
                    }}>
                      <User size={14} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>المدرس</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {teacherName}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(245,158,11,0.12)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      color: '#f59e0b',
                    }}>
                      <Calendar size={14} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>الميعاد / المجموعة</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {groupName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{
                  padding: '14px 22px',
                  background: 'rgba(0,0,0,0.25)',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    محتوى الكورس والواجبات
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: courseTheme.secondary,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    <span>{t('courses.open')}</span>
                    <ChevronRight size={15} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
