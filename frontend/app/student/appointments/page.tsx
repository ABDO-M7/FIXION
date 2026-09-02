'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { appointmentsApi, enrollmentsApi } from '@/lib/api';
import {
  Calendar, Plus, Clock, CheckCircle, XCircle,
  MessageSquare, BookOpen, Send, User, ChevronRight, AlertCircle, X, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Appointment = {
  id: string;
  courseName: string;
  topic: string;
  message?: string;
  preferredTime?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  teacherReply?: string;
  scheduledTime?: string;
  createdAt: string;
  teacher?: { id: string; name: string; email: string } | null;
};

export default function StudentAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    courseName: '',
    topic: '',
    message: '',
    preferredTime: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptsRes, enrollRes] = await Promise.all([
        appointmentsApi.mine(),
        enrollmentsApi.my().catch(() => ({ data: [] })),
      ]);
      setAppointments(apptsRes.data || []);
      setEnrollments(enrollRes.data || []);
      if (enrollRes.data?.[0]?.courseName) {
        setForm((prev) => ({ ...prev, courseName: prev.courseName || enrollRes.data[0].courseName }));
      }
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseName.trim()) {
      toast.error('Please select or enter a course name');
      return;
    }
    if (!form.topic.trim()) {
      toast.error('Please specify the topic you need explained');
      return;
    }

    setSubmitting(true);
    try {
      await appointmentsApi.create(form);
      toast.success('Appointment request sent to teachers! 🚀');
      setShowModal(false);
      setForm({ courseName: enrollments[0]?.courseName || '', topic: '', message: '', preferredTime: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="badge badge-answered" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} /> Accepted & Scheduled
          </span>
        );
      case 'DECLINED':
        return (
          <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={12} /> Declined
          </span>
        );
      default:
        return (
          <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> Pending Teacher Review
          </span>
        );
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar className="page-title-icon" /> Explanation Appointments
          </h1>
          <p className="page-subtitle">
            Request 1-on-1 explanation sessions with your specialized teachers.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> Request Appointment
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 540, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Appointment Requests Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            Stuck on a tricky topic? Request an appointment and a specialized teacher will reach out to explain it to you.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ margin: '0 auto' }}
          >
            <Plus size={16} style={{ marginRight: 6 }} /> Request Your First Appointment
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {appointments.map((appt) => (
            <div key={appt.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span className="badge badge-active" style={{ fontSize: 11, fontWeight: 700 }}>
                      <BookOpen size={11} style={{ marginRight: 4 }} />
                      {appt.courseName}
                    </span>
                    {getStatusBadge(appt.status)}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{appt.topic}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Requested on {format(new Date(appt.createdAt), 'PPP p')}
                  </div>
                </div>

                {appt.preferredTime && (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Preferred Time</div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-light)', marginTop: 2 }}>{appt.preferredTime}</div>
                  </div>
                )}
              </div>

              {appt.message && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Your Note: </span>
                  {appt.message}
                </div>
              )}

              {/* Teacher response box */}
              {appt.teacherReply && (
                <div style={{
                  background: appt.status === 'ACCEPTED' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${appt.status === 'ACCEPTED' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  borderRadius: 12, padding: 14, marginTop: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <User size={14} style={{ color: appt.status === 'ACCEPTED' ? '#10b981' : '#ef4444' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: appt.status === 'ACCEPTED' ? '#10b981' : '#ef4444' }}>
                      Teacher Reply {appt.teacher?.name ? `(${appt.teacher.name})` : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-main)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {appt.teacherReply}
                  </p>
                  {appt.scheduledTime && (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} /> Scheduled for: {appt.scheduledTime}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal to Request New Appointment */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: 'var(--primary-light)' }} /> Request 1-on-1 Explanation
              </h3>
              <button onClick={() => setShowModal(false)} className="icon-btn" style={{ width: 28, height: 28 }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Select Course / Subject *</label>
                {enrollments.length > 0 ? (
                  <select
                    className="form-input"
                    value={form.courseName}
                    onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                    required
                  >
                    <option value="" disabled>-- Select a course --</option>
                    {enrollments.map((e: any) => (
                      <option key={e.id} value={e.courseName}>{e.courseName}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. فيزيا, رياضه..."
                    value={form.courseName}
                    onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                    required
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Topic / Part to Explain *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Newton's 2nd Law, Integration by Parts..."
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Date & Time (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tomorrow at 5:00 PM, Saturday afternoon..."
                  value={form.preferredTime}
                  onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Details / Specific Questions (Optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Explain what specific part you're struggling with..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
