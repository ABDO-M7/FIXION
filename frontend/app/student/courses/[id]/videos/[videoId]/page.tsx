'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppShell from '@/components/AppShell';
import InteractiveCourseVideoPlayer, { InteractiveCourseVideo } from '@/components/InteractiveCourseVideoPlayer';
import { enrollmentsApi, videosApi } from '@/lib/api';

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
        <Link href={`/student/courses/${encodeURIComponent(id)}`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginBottom: 20 }}><ArrowLeft size={14} /> Back to {courseName || 'course videos'}</Link>
        {loading ? <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}><span className="spinner" /></div> : video ? <InteractiveCourseVideoPlayer video={video} /> : <div className="card" style={{ padding: 40, textAlign: 'center' }}>Video not found.</div>}
      </div>
    </AppShell>
  );
}
