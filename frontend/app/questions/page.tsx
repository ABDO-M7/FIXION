'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { isStaffRole } from '@/lib/roles';

export default function QuestionsRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login?redirect=/questions');
      return;
    }
    if (user.role === 'admin') {
      router.replace('/admin/questions');
    } else if (isStaffRole(user.role)) {
      router.replace('/teacher/questions');
    } else {
      router.replace('/student/questions');
    }
  }, [user, isLoading, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" />
    </div>
  );
}
