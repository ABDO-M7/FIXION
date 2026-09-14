'use client';

import { Plus, Trash2, Video, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { videosApi } from '@/lib/api';
import { CourseVideo, CourseVideoPlayer } from './CourseVideoPlayer';

export default function TeacherVideosTab({ courseName, groupName }: { courseName: string; groupName: string }) {
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', youtubeUrl: '' });
  const load = useCallback(() => videosApi.teacherList(courseName, groupName).then(r => setVideos(r.data)).catch(() => toast.error('Failed to load videos')).finally(() => setLoading(false)), [courseName, groupName]);
  useEffect(() => { load(); }, [courseName, groupName]);

  const save = async () => {
    if (!form.title.trim() || !form.youtubeUrl.trim()) return toast.error('Title and YouTube link are required');
    setSaving(true);
    try {
      await videosApi.create({ ...form, courseName, groupName });
      toast.success('Video added');
      setForm({ title: '', description: '', youtubeUrl: '' }); setShowForm(false); setLoading(true); load();
    } catch { toast.error('Could not add video'); }
    finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    try { await videosApi.delete(id); setVideos(items => items.filter(v => v.id !== id)); toast.success('Video deleted'); }
    catch { toast.error('Could not delete video'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><span className="spinner" /></div>;
  return <>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Video</button></div>
    {videos.length === 0 ? <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}><Video size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} /><h3 style={{ marginBottom: 8 }}>No videos yet</h3><p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>Add a YouTube video for students in this group.</p><button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Video</button></div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>{videos.map(video => <div key={video.id} style={{ position: 'relative' }}><CourseVideoPlayer video={video} /><button className="btn btn-danger btn-sm" onClick={() => remove(video.id)} style={{ position: 'absolute', right: 10, top: 10 }}><Trash2 size={13} /> Delete</button></div>)}</div>}
    {showForm && <div onClick={e => e.target === e.currentTarget && setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}><div className="card" style={{ width: '100%', maxWidth: 520 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}><h3>Add course video</h3><button className="icon-btn" onClick={() => setShowForm(false)}><X size={16} /></button></div><div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Lesson 1: Introduction" /></div><div className="form-group"><label className="form-label">YouTube link *</label><input className="form-input" type="url" value={form.youtubeUrl} onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." /></div><div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Adding…' : 'Add Video'}</button></div></div></div></div>}
  </>;
}
