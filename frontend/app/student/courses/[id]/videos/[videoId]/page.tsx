'use client';

import { ArrowLeft, FileText, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import InteractiveCourseVideoPlayer, { InteractiveCourseVideo } from '@/components/InteractiveCourseVideoPlayer';
import { enrollmentsApi, videosApi } from '@/lib/api';

function formatAttachmentLabel(url: string, index: number) {
  if (url.includes('drive.google.com')) return `ملزمة الدرس (Google Drive ${index > 0 ? index + 1 : ''})`;
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const name = decodeURIComponent(url.split('/').pop() || 'ملف PDF');
    return `ملف PDF: ${name}`;
  }
  return `ملف مرفق ${index + 1}`;
}

export default function StudentVideoPage() {
  const { id, videoId } = useParams<{ id: string; videoId: string }>();
  const [video, setVideo] = useState<InteractiveCourseVideo | null>(null);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const enrollment = await enrollmentsApi.one(id);
        const response = await videosApi.studentList(enrollment.data.courseName, enrollment.data.groupName);
        const selected = response.data.find((item: InteractiveCourseVideo) => item.id === videoId);
        if (!selected) throw new Error('Video not found');
        if (active) {
          setCourseName(enrollment.data.courseName);
          setVideo(selected);
        }
      } catch {
        toast.error('Could not load this video');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id, videoId]);

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 50px' }}>
        <Link href={`/student/courses/${encodeURIComponent(id)}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginBottom: 20 }}>
          <ArrowLeft size={14} /> Back to {courseName || 'course videos'}
        </Link>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
            <span className="spinner" />
          </div>
        ) : video ? (
          <div>
            <InteractiveCourseVideoPlayer video={video} />

            {/* Attached lesson materials / PDF / Google Drive */}
            {video.attachments && video.attachments.length > 0 && (
              <div
                className="card"
                style={{
                  marginTop: 24,
                  padding: '18px 22px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <FileText size={18} style={{ color: '#ef4444' }} />
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    ملفات وملزمة الحصة (PDF والمرفقات)
                  </h4>
                  <span className="badge" style={{ fontSize: 11, background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                    {video.attachments.length} {video.attachments.length === 1 ? 'ملف متاح' : 'ملفات متاحة'}
                  </span>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                  يمكنك تحميل مذكرة الحصة أو فتح ملفات الـ PDF وروابط Google Drive المرفقة مع هذا الدرس:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {video.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Download size={14} style={{ color: '#ef4444' }} />
                      <span>{formatAttachmentLabel(url, i)}</span>
                      <ExternalLink size={12} style={{ opacity: 0.6 }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>Video not found.</div>
        )}
      </div>
    </AppShell>
  );
}
