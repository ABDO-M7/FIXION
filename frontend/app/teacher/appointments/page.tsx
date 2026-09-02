'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { appointmentsApi } from '@/lib/api';
import {
  Calendar, Clock, CheckCircle, XCircle,
  MessageSquare, User, BookOpen, Phone, GraduationCap, Mail, X, Send, Filter,
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
  student?: {
    id: string;
    name: string;
    email: string;
    studentId?: string;
    phone?: string;
    level?: string;
    avatarUrl?: string;
  } | null;
  teacher?: { id: string; name: string; email: string } | null;
};

export default function TeacherAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const [replyForm, setReplyForm] = useState({
    status: 'ACCEPTED' as 'ACCEPTED' | 'DECLINED',
    teacherReply: '',
    scheduledTime: '',
  });
  const [saving, setSaving] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.teacherList();
      setAppointments(res.data || []);
    } catch {
      toast.error('Failed to load appointment requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleOpenReplyModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setReplyForm({
      status: appt.status === 'DECLINED' ? 'DECLINED' : 'ACCEPTED',
      teacherReply: appt.teacherReply || '',
      scheduledTime: appt.scheduledTime || appt.preferredTime || '',
    });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    setSaving(true);
    try {
      await appointmentsApi.reply(selectedAppt.id, replyForm);
      toast.success(`Appointment request ${replyForm.status.toLowerCase()} successfully!`);
      setSelectedAppt(null);
      loadAppointments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save response');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar className="page-title-icon" /> Student Appointment Requests
          </h1>
          <p className="page-subtitle">
            1-on-1 explanation requests from students in your specialized subjects.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 540, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Appointment Requests</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            There are no pending explanation requests for your subjects right now.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {appointments.map((appt) => (
            <div key={appt.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                
                {/* Student Info */}
                <div style={{ display: 'flex', gap: 14, flex: 1, minWidth: 280 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', background: 'var(--primary-dark)',
                    color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 18, flexShrink: 0,
                  }}>
                    {appt.student?.avatarUrl ? (
                      <img src={appt.student.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      appt.student?.name?.[0]?.toUpperCase() || 'S'
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {appt.student?.name || 'Student'}
                      {appt.student?.studentId && (
                        <span style={{ fontSize: 11, color: 'var(--primary-light)', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          ID: {appt.student.studentId}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 4, flexWrap: 'wrap' }}>
                      {appt.student?.email && <span><Mail size={11} style={{ marginRight: 3 }} />{appt.student.email}</span>}
                      {appt.student?.phone && <span><Phone size={11} style={{ marginRight: 3 }} />{appt.student.phone}</span>}
                      {appt.student?.level && <span><GraduationCap size={11} style={{ marginRight: 3 }} />{appt.student.level}</span>}
                    </div>
                  </div>
                </div>

                {/* Status & Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {appt.status === 'ACCEPTED' && (
                    <span className="badge badge-answered"><CheckCircle size={12} style={{ marginRight: 4 }} /> Accepted</span>
                  )}
                  {appt.status === 'DECLINED' && (
                    <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><XCircle size={12} style={{ marginRight: 4 }} /> Declined</span>
                  )}
                  {appt.status === 'PENDING' && (
                    <span className="badge badge-pending"><Clock size={12} style={{ marginRight: 4 }} /> Pending</span>
                  )}

                  <button
                    onClick={() => handleOpenReplyModal(appt)}
                    className={`btn ${appt.status === 'PENDING' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  >
                    {appt.status === 'PENDING' ? 'Reply / Schedule' : 'Edit Reply'}
                  </button>
                </div>
              </div>

              {/* Request Details */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-active" style={{ fontSize: 11, fontWeight: 700 }}>
                    <BookOpen size={11} style={{ marginRight: 4 }} /> {appt.courseName}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                    Topic: {appt.topic}
                  </span>
                </div>

                {appt.preferredTime && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    ⏰ <strong>Student Preferred Time:</strong> {appt.preferredTime}
                  </div>
                )}

                {appt.message && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    💬 "{appt.message}"
                  </div>
                )}

                {appt.teacherReply && (
                  <div style={{ background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid var(--primary-light)', padding: 10, borderRadius: '0 8px 8px 0', marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', marginBottom: 2 }}>Your Response:</div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{appt.teacherReply}</div>
                    {appt.scheduledTime && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                        Scheduled Time: {appt.scheduledTime}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {selectedAppt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 17 }}>
                Reply to {selectedAppt.student?.name || 'Student'}
              </h3>
              <button onClick={() => setSelectedAppt(null)} className="icon-btn" style={{ width: 28, height: 28 }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Decision *</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className={`btn ${replyForm.status === 'ACCEPTED' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setReplyForm({ ...replyForm, status: 'ACCEPTED' })}
                    style={{ flex: 1 }}
                  >
                    <CheckCircle size={15} style={{ marginRight: 6 }} /> Accept & Schedule
                  </button>
                  <button
                    type="button"
                    className={`btn ${replyForm.status === 'DECLINED' ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => setReplyForm({ ...replyForm, status: 'DECLINED' })}
                    style={{ flex: 1, color: replyForm.status === 'DECLINED' ? '#ef4444' : undefined, borderColor: replyForm.status === 'DECLINED' ? '#ef4444' : undefined }}
                  >
                    <XCircle size={15} style={{ marginRight: 6 }} /> Decline
                  </button>
                </div>
              </div>

              {replyForm.status === 'ACCEPTED' && (
                <div className="form-group">
                  <label className="form-label">Confirmed Scheduled Time *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Wednesday at 4:00 PM via Zoom / Classroom"
                    value={replyForm.scheduledTime}
                    onChange={(e) => setReplyForm({ ...replyForm, scheduledTime: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Message / Response to Student</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={replyForm.status === 'ACCEPTED' ? "e.g. Sure! Bring your exercises book to room 203." : "e.g. Sorry, I am fully booked at that time. Please request another slot."}
                  value={replyForm.teacherReply}
                  onChange={(e) => setReplyForm({ ...replyForm, teacherReply: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={() => setSelectedAppt(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
