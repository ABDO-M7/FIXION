'use client';
import { useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { questionsApi, uploadsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  content: z.string().min(20, 'Question must be at least 20 characters').max(5000),
});

type FormData = z.infer<typeof schema>;

export default function NewQuestionPage() {
  const [files, setFiles] = useState<{ file: File; url?: string; uploading?: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch('content') || '';

  const onDrop = useCallback(async (accepted: File[]) => {
    for (const file of accepted.slice(0, 3)) {
      const id = file.name + file.size;
      setFiles(prev => [...prev, { file, uploading: true }]);
      try {
        const res = await uploadsApi.upload(file);
        setFiles(prev => prev.map(f =>
          f.file.name === file.name && f.file.size === file.size
            ? { ...f, url: res.data.url, uploading: false }
            : f
        ));
      } catch {
        toast.error(`Failed to upload ${file.name}`);
        setFiles(prev => prev.filter(f => !(f.file.name === file.name && f.file.size === file.size)));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [], 'application/msword': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] },
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const onSubmit = async (data: FormData) => {
    const uploadedUrls = files.filter(f => f.url).map(f => f.url!);
    setIsSubmitting(true);
    try {
      const res = await questionsApi.submit({ content: data.content, attachments: uploadedUrls });
      toast.success('Question submitted! A teacher will answer soon.');
      router.push(`/student/questions/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Link href="/student/questions" className="btn btn-ghost btn-sm" style={{ marginBottom: 8, paddingLeft: 0 }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <h1 className="page-title">Ask a Question</h1>
          <p className="page-subtitle">Our teachers will answer your academic question</p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                Your Question
              </label>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                Be specific. Include the subject, chapter, and what you're struggling with.
              </p>
              <textarea
                {...register('content')}
                className={`form-input form-textarea ${errors.content ? 'error' : ''}`}
                placeholder="e.g. I'm studying Chapter 3 of Biology about cell division. I don't understand the difference between mitosis and meiosis. Can you explain with examples?"
                style={{ minHeight: 200, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                {errors.content ? (
                  <span className="form-error">{errors.content.message}</span>
                ) : <span />}
                <span style={{ fontSize: 12, color: content.length > 4500 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {content.length} / 5000
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Attachments (optional)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Add images of your textbook page, exercise, or any relevant files. Max 3 files, 10MB each.
            </p>

            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-elevated)',
              }}
            >
              <input {...getInputProps()} />
              <Upload size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse — Images, PDF, Word</p>
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 12px'
                  }}>
                    {f.file.type.startsWith('image/') ? <Image size={16} style={{ color: 'var(--primary-light)' }} /> : <FileText size={16} style={{ color: 'var(--primary-light)' }} />}
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</span>
                    {f.uploading
                      ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      : <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>✓</span>}
                    <button type="button" onClick={() => removeFile(i)} className="icon-btn" style={{ width: 28, height: 28 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={isSubmitting || files.some(f => f.uploading)}
          >
            {isSubmitting
              ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Submitting...</>
              : <><Send size={16} /> Submit Question</>}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
