'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import { GraduationCap, ChevronRight, Layers, BookOpen, Users, Plus, X, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const COURSE_COLORS: Record<string, string> = {
  'فيزيا':  '#6366f1',
  'رياضه':  '#10b981',
  'احصاء':  '#f59e0b',
  'عربي':   '#ef4444',
  'برمجه':  '#8b5cf6',
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editCourseModal, setEditCourseModal] = useState<{ originalName: string; newName: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const router = useRouter();

  const loadCourses = () => {
    assignmentsApi.myCourses()
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        const fallback = ['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه'];
        const set = new Set([...fallback, ...list]);
        setCourses(Array.from(set));
      })
      .catch(() => {
        setCourses(['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه']);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreateCourse = async () => {
    const name = newCourseName.trim();
    if (!name) {
      toast.error('Course name is required');
      return;
    }
    try {
      setSubmitting(true);
      await assignmentsApi.createCourse({ name });
      toast.success(`Course "${name}" created!`);
      setShowAddCourse(false);
      router.push(`/admin/courses/${encodeURIComponent(name)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (e: React.MouseEvent, courseName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete course "${courseName}"?`)) return;
    try {
      await assignmentsApi.deleteCourse(courseName);
      setCourses(prev => prev.filter(c => c !== courseName));
      toast.success(`Course "${courseName}" deleted`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleOpenEditCourse = (e: React.MouseEvent, courseName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditCourseModal({ originalName: courseName, newName: courseName });
  };

  const handleRenameCourse = async () => {
    if (!editCourseModal) return;
    const targetName = editCourseModal.newName.trim();
    if (!targetName) {
      toast.error('Course name is required');
      return;
    }
    if (targetName === editCourseModal.originalName) {
      setEditCourseModal(null);
      return;
    }
    try {
      setRenaming(true);
      await assignmentsApi.updateCourse(editCourseModal.originalName, { name: targetName });
      setCourses(prev => prev.map(c => c === editCourseModal.originalName ? targetName : c));
      toast.success(`Course renamed to "${targetName}"!`);
      setEditCourseModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rename course');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <AppShell>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Course Workflows & Management</h1>
          <p className="page-subtitle">Manage curriculum, lessons, and unlock rules across all courses</p>
        </div>
        <button
          onClick={() => { setNewCourseName(''); setShowAddCourse(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Add Course
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" style={{ width: 34, height: 34, borderWidth: 3 }} />
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 18 }}>
          {courses.map(course => {
            const color = COURSE_COLORS[course] || '#6366f1';
            return (
              <Link
                key={course}
                href={`/admin/courses/${encodeURIComponent(course)}`}
                className="card"
                style={{
                  display: 'block', textDecoration: 'none', padding: 0,
                  overflow: 'hidden', cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div style={{ height: 6, background: color }} />
                <div style={{ padding: '22px 20px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 50, height: 50, borderRadius: 12,
                        background: `${color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <GraduationCap size={24} style={{ color }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>
                          {course}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Subject Curriculum
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={e => handleOpenEditCourse(e, course)}
                        className="icon-btn"
                        title="Rename Course"
                        style={{ color: 'var(--text-muted)', opacity: 0.7 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-light)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={e => handleDeleteCourse(e, course)}
                        className="icon-btn"
                        title="Delete Course"
                        style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Layers size={13} /> Manage Workflows
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Select Groups <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add New Course</h3>
              <button className="icon-btn" onClick={() => setShowAddCourse(false)}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Course Subject Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. كيمياء, أحياء, English, برمجه"
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && handleCreateCourse()}
                  disabled={submitting}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button className="btn btn-secondary" onClick={() => setShowAddCourse(false)} disabled={submitting}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreateCourse} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Course Modal */}
      {editCourseModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={16} style={{ color: 'var(--primary-light)' }} /> Rename Course
              </h3>
              <button className="icon-btn" onClick={() => setEditCourseModal(null)}><X size={15} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Renaming <strong>"{editCourseModal.originalName}"</strong> will seamlessly update all connected lessons, videos, enrollments, and codes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>New Course Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editCourseModal.newName}
                  onChange={e => setEditCourseModal(prev => prev ? { ...prev, newName: e.target.value } : null)}
                  onKeyDown={e => e.key === 'Enter' && !renaming && handleRenameCourse()}
                  disabled={renaming}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button className="btn btn-secondary" onClick={() => setEditCourseModal(null)} disabled={renaming}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleRenameCourse} disabled={renaming}>
                  {renaming ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}




