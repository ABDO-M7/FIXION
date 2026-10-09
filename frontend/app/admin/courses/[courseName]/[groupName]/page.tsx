'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import CourseWorkflowBuilder from '@/components/CourseWorkflowBuilder';
import {
  ArrowLeft, GraduationCap, Users, BookOpen, BarChart2,
  Video, ClipboardList
} from 'lucide-react';
import Link from 'next/link';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

type Tab = 'WORKFLOW';

export default function AdminCourseDetailPage() {
  const { courseName, groupName } = useParams<{ courseName: string; groupName: string }>();
  const decoded = decodeURIComponent(courseName);
  const decodedGroup = decodeURIComponent(groupName);
  const color = COURSE_COLORS[decoded] || '#6366f1';

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Link href={`/admin/courses/${encodeURIComponent(decoded)}`} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Groups
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Users size={22} style={{ color }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 className="page-title" style={{ marginBottom: 2 }}>{decodedGroup}</h1>
                <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 11 }}>
                  Admin Control
                </span>
              </div>
              <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <GraduationCap size={13} /> {decoded} Course
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Workflow Builder */}
      <CourseWorkflowBuilder
        courseName={decoded}
        groupName={decodedGroup}
        isAdmin={true}
      />
    </AppShell>
  );
}
