'use client';

import { Check, FileUp, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadsApi, videosApi } from '@/lib/api';
import { VideoCheckpoint } from './InteractiveCourseVideoPlayer';

type Props = { videoId: string; onClose: () => void };

const blank = {
  timestampSeconds: '0',
  prompt: '',
  type: 'MCQ',
  options: ['', '', '', ''],
  correctAnswer: 'A',
  solutionText: '',
  solutionUrl: '',
  requireSolutionUpload: false,
  showSolutionAfterAnswer: true,
};

export default function VideoCheckpointEditor({ videoId, onClose }: Props) {
  const [items, setItems] = useState<VideoCheckpoint[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSolution, setUploadingSolution] = useState(false);

  const load = useCallback(() => {
    videosApi.teacherCheckpoints(videoId)
      .then(response => setItems(response.data))
      .catch(() => toast.error('Could not load checkpoint questions'))
      .finally(() => setLoading(false));
  }, [videoId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.prompt.trim()) return toast.error('Question text is required');
    if (form.type === 'MCQ' && form.options.filter(Boolean).length < 2) return toast.error('Add at least two MCQ options');
    setSaving(true);
    try {
      await videosApi.createCheckpoint(videoId, {
        timestampSeconds: Number(form.timestampSeconds),
        prompt: form.prompt,
        type: form.type,
        options: form.type === 'MCQ' ? form.options.map((text, index) => ({ id: String.fromCharCode(65 + index), text })).filter(item => item.text.trim()) : [],
        correctAnswer: form.type === 'MCQ' ? form.correctAnswer : undefined,
        solutionText: form.solutionText,
        solutionUrl: form.solutionUrl,
        requireSolutionUpload: form.type === 'ESSAY' && form.requireSolutionUpload,
        showSolutionAfterAnswer: form.showSolutionAfterAnswer,
      });
      toast.success('Checkpoint added');
      setForm({ ...blank });
      setLoading(true);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not add checkpoint');
    } finally {
      setSaving(false);
    }
  };

  const uploadSolution = async (file: File) => {
    setUploadingSolution(true);
    try {
      const response = await uploadsApi.upload(file);
      setForm(previous => ({ ...previous, solutionUrl: response.data.url }));
      toast.success('Solution file uploaded');
    } catch {
      toast.error('Could not upload solution file');
    } finally {
      setUploadingSolution(false);
    }
  };

  const remove = async (checkpointId: string) => {
    if (!confirm('Delete this checkpoint?')) return;
    try {
      await videosApi.deleteCheckpoint(videoId, checkpointId);
      setItems(previous => previous.filter(item => item.id !== checkpointId));
    } catch {
      toast.error('Could not delete checkpoint');
    }
  };

  return (
    <div onClick={event => event.target === event.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1100, padding: 20, overflowY: 'auto', background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 760, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div><h3 style={{ margin: 0 }}>Video checkpoints</h3><p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>The video pauses at each timestamp until the student answers.</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gap: 12, padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">Pause at (seconds) *</label><input className="form-input" type="number" min={0} value={form.timestampSeconds} onChange={event => setForm(previous => ({ ...previous, timestampSeconds: event.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Question *</label><input className="form-input" value={form.prompt} onChange={event => setForm(previous => ({ ...previous, prompt: event.target.value }))} placeholder="What is the main idea of this section?" /></div>
          </div>
          <div className="form-group"><label className="form-label">Question type</label><select className="form-input" value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value, options: blank.options, correctAnswer: 'A' }))}><option value="MCQ">MCQ — require the correct answer</option><option value="ESSAY">Essay — require a written response</option></select></div>

          {form.type === 'MCQ' && <div style={{ display: 'grid', gap: 8 }}>
            <label className="form-label">Options and correct answer</label>
            {form.options.map((option, index) => <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button type="button" aria-label={'Mark option ' + String.fromCharCode(65 + index) + ' as correct'} onClick={() => setForm(previous => ({ ...previous, correctAnswer: String.fromCharCode(65 + index) }))} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: form.correctAnswer === String.fromCharCode(65 + index) ? 'rgba(16,185,129,.16)' : 'transparent', color: form.correctAnswer === String.fromCharCode(65 + index) ? '#86efac' : 'var(--text-muted)', cursor: 'pointer' }}>{form.correctAnswer === String.fromCharCode(65 + index) ? <Check size={14} /> : String.fromCharCode(65 + index)}</button><input className="form-input" value={option} onChange={event => setForm(previous => ({ ...previous, options: previous.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} placeholder={'Option ' + String.fromCharCode(65 + index)} /></div>)}
          </div>}

          {form.type === 'ESSAY' && <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}><input type="checkbox" checked={form.requireSolutionUpload} onChange={event => setForm(previous => ({ ...previous, requireSolutionUpload: event.target.checked }))} /> Require the student to upload a solution file</label>}
          <div className="form-group"><label className="form-label">Solution / explanation (shown after a valid answer)</label><textarea className="form-input" rows={3} value={form.solutionText} onChange={event => setForm(previous => ({ ...previous, solutionText: event.target.value }))} placeholder="Explain the answer or add the model solution..." /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: uploadingSolution ? 'wait' : 'pointer' }}><FileUp size={13} /> {uploadingSolution ? 'Uploading...' : 'Upload solution file'}<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={event => event.target.files?.[0] && uploadSolution(event.target.files[0])} style={{ display: 'none' }} /></label>
            {form.solutionUrl && <span style={{ fontSize: 12, color: '#86efac' }}>Solution file attached</span>}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}><input type="checkbox" checked={form.showSolutionAfterAnswer} onChange={event => setForm(previous => ({ ...previous, showSolutionAfterAnswer: event.target.checked }))} /> Show solution after answer</label>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving || uploadingSolution}><Plus size={14} /> {saving ? 'Saving...' : 'Add checkpoint'}</button>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
          {loading ? <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div> : items.length === 0 ? <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No checkpoints yet.</div> : items.map(item => <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9 }}><span className="badge badge-pending">{item.timestampSeconds}s</span><span style={{ flex: 1, fontSize: 13 }}>{item.prompt}</span><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.type}</span><button className="btn btn-danger btn-sm" onClick={() => remove(item.id)} aria-label="Delete checkpoint"><Trash2 size={13} /></button></div>)}
        </div>
      </div>
    </div>
  );
}
