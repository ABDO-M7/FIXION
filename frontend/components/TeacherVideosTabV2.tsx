'use client';

import { ListChecks, Plus, Trash2, Video, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { videosApi } from '@/lib/api';
import InteractiveCourseVideoPlayer, { InteractiveCourseVideo } from './InteractiveCourseVideoPlayer';
import VideoCheckpointEditor from './VideoCheckpointEditor';

export default function TeacherVideosTabV2({ courseName, groupName }: { courseName: string; groupName: string }) {
  const [videos, setVideos] = useState<InteractiveCourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', provider: 'youtube', sourceUrl: '' });

  const load = useCallback(() => {
    videosApi.teacherList(courseName, groupName)
      .then(response => setVideos(response.data))
      .catch(() => toast.error('Failed to load videos'))
      .finally(() => setLoading(false));
  }, [courseName, groupName]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.sourceUrl.trim()) {
      toast.error('Title and video link are required');
      return;
    }
    setSaving(true);
    try {
      await videosApi.create({ ...form, courseName, groupName });
      toast.success('Video added');
      setForm({ title: '', description: '', provider: 'youtube', sourceUrl: '' });
      setShowForm(false);
      setLoading(true);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not add video');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    try {
      await videosApi.delete(id);
      setVideos(items => items.filter(item => item.id !== id));
      toast.success('Video deleted');
    } catch {
      toast.error('Could not delete video');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><span className="spinner" /></div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Video</button>
      </div>
      {videos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}>
          <Video size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ marginBottom: 8 }}>No videos yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>Add a YouTube, Vimeo, Wistia, or Bunny Stream video for this group.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Video</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {videos.map(video => (
            <div key={video.id}>
              <InteractiveCourseVideoPlayer video={video} preview />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingVideoId(video.id)}><ListChecks size={13} /> Questions</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(video.id)}><Trash2 size={13} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div onClick={event => event.target === event.currentTarget && setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3>Add course video</h3>
              <button className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} placeholder="e.g. Lesson 1: Introduction" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
                <div className="form-group"><label className="form-label">Provider</label><select className="form-input" value={form.provider} onChange={event => setForm(previous => ({ ...previous, provider: event.target.value }))}><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="wistia">Wistia</option><option value="bunny">Bunny Stream</option></select></div>
                <div className="form-group"><label className="form-label">Video link or embed code *</label><textarea className="form-input" rows={form.provider === 'wistia' ? 4 : 2} value={form.sourceUrl} onChange={event => setForm(previous => ({ ...previous, sourceUrl: event.target.value }))} placeholder={form.provider === 'wistia' ? 'Paste the Wistia iframe, script, or wistia_async embed code' : 'Paste the provider link'} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Adding...' : 'Add Video'}</button></div>
            </div>
          </div>
        </div>
      )}
      {editingVideoId && <VideoCheckpointEditor videoId={editingVideoId} onClose={() => setEditingVideoId(null)} />}
    </>
  );
}
