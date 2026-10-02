'use client';

import { ArrowRight, Play, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { videosApi } from '@/lib/api';
import Link from 'next/link';
import { InteractiveCourseVideo } from './InteractiveCourseVideoPlayer';

export default function StudentVideosTab({ courseName, groupName, enrollmentId }: { courseName: string; groupName: string; enrollmentId: string }) {
  const [videos, setVideos] = useState<InteractiveCourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    videosApi.studentList(courseName, groupName)
      .then(r => setVideos(r.data))
      .catch(() => toast.error('Failed to load videos'))
      .finally(() => setLoading(false));
  }, [courseName, groupName]);
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><span className="spinner" /></div>;
  if (!videos.length) return <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}><Video size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} /><h3 style={{ marginBottom: 8 }}>No videos yet</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your team member has not posted any videos for this course yet.</p></div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
      {videos.map(video => {
        const provider = video.provider || 'youtube';
        const thumbnail = provider === 'youtube' && (video.providerVideoId || video.youtubeVideoId)
          ? `https://i.ytimg.com/vi/${video.providerVideoId || video.youtubeVideoId}/hqdefault.jpg`
          : undefined;
        return (
          <Link key={video.id} href={`/student/courses/${encodeURIComponent(enrollmentId)}/videos/${encodeURIComponent(video.id)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <article className="card" style={{ padding: 0, overflow: 'hidden', height: '100%', transition: 'transform .2s ease, border-color .2s ease' }}>
              <div style={{ aspectRatio: '16 / 9', background: thumbnail ? `linear-gradient(rgba(5,10,18,.15), rgba(5,10,18,.72)), url(${thumbnail}) center / cover` : 'linear-gradient(135deg, #111827, #0f172a)', display: 'grid', placeItems: 'center' }}>
                <span style={{ width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--primary)', color: '#fff', boxShadow: '0 8px 25px rgba(0,0,0,.35)' }}><Play size={22} fill="currentColor" /></span>
              </div>
              <div style={{ padding: '15px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, flex: 1 }}>{video.title}</h3>
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                {video.description && <p style={{ margin: '7px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>{video.description}</p>}
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
