'use client';

import { Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { videosApi } from '@/lib/api';
import { CourseVideo, CourseVideoPlayer } from './CourseVideoPlayer';

export default function StudentVideosTab({ courseName, groupName }: { courseName: string; groupName: string }) {
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    videosApi.studentList(courseName, groupName)
      .then(r => setVideos(r.data))
      .catch(() => toast.error('Failed to load videos'))
      .finally(() => setLoading(false));
  }, [courseName, groupName]);
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><span className="spinner" /></div>;
  if (!videos.length) return <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}><Video size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} /><h3 style={{ marginBottom: 8 }}>No videos yet</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your team member has not posted any videos for this course yet.</p></div>;
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>{videos.map(video => <CourseVideoPlayer key={video.id} video={video} />)}</div>;
}
