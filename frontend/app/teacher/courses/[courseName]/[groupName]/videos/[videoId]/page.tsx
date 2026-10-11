'use client';

import { ArrowLeft, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import InteractiveCourseVideoPlayer, { type InteractiveCourseVideo } from '@/components/InteractiveCourseVideoPlayer';
import { videosApi } from '@/lib/api';

type CourseVideo = InteractiveCourseVideo & { attachments?: string[] };

function formatAttachmentLabel(url: string, index: number) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const name = decodeURIComponent(url.split('/').pop() || '');
    if (name && !name.startsWith('blob:') && name.length < 35) return name;
  }
  return index > 0 ? `تحميل الملف (${index + 1})` : 'تحميل الملف';
}

export default function TeacherVideoPage() {
  const { courseName, groupName, videoId } = useParams<{ courseName: string; groupName: string; videoId: string }>();
  const decoded = decodeURIComponent(courseName);
  const decodedGroup = decodeURIComponent(groupName);
  const [video, setVideo] = useState<CourseVideo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await videosApi.teacherList(decoded, decodedGroup);
        const found = res.data.find((item: CourseVideo) => item.id === videoId);
        if (!found) throw new Error('Video not found');
        if (active) setVideo(found);
      } catch {
        toast.error('Could not load this video');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [decoded, decodedGroup, videoId]);

  const backHref = `/teacher/courses/${encodeURIComponent(decoded)}/${encodeURIComponent(decodedGroup)}`;

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 50px' }}>
        <Link href={backHref} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginBottom: 20 }}>
          <ArrowLeft size={14} /> Back to {decoded}
        </Link>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
            <span className="spinner" />
          </div>
        ) : video ? (
          <div>
            <InteractiveCourseVideoPlayer video={video} preview />
            {video.attachments && video.attachments.length > 0 && (
              <div className="card" style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} style={{ color: 'var(--primary-light)' }} />
                  المرفقات
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {video.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)',
                        border: '1px solid rgba(99,102,241,0.25)', textDecoration: 'none',
                      }}
                    >
                      <Download size={14} />
                      {formatAttachmentLabel(url, i)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Video not found.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}