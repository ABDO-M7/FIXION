'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { assignmentsApi } from '@/lib/api';
import {
  ArrowLeft, CheckCircle, Clock, Search, Edit3, Award,
  MessageSquare, BookOpen, ClipboardList, Check, X, FileText,
  Download, ExternalLink, HelpCircle, Users, CheckCircle2,
  AlertCircle, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function MathText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <span key={i} style={{
              fontFamily: 'Georgia, serif', fontStyle: 'italic',
              background: 'rgba(99,102,241,0.18)', padding: '2px 8px',
              borderRadius: 4, fontSize: '0.95em', display: 'inline-block', margin: '2px 0',
            }}>
              {part.slice(2, -2).trim()}
            </span>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <em key={i} style={{
              fontFamily: 'Georgia, serif',
              color: '#818cf8',
            }}>
              {part.slice(1, -1).trim()}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

type FilterStatus = 'ALL' | 'SUBMITTED' | 'NEEDS_GRADING' | 'GRADED' | 'NOT_SUBMITTED';

export default function TeacherSubmissionsPage() {
  const params = useParams();
  const router = useRouter();

  const courseName = params.courseName as string;
  const groupName = params.groupName as string;
  const assignmentId = params.id as string;

  const decodedCourse = decodeURIComponent(courseName || '');
  const decodedGroup = decodeURIComponent(groupName || '');

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [studentRows, setStudentRows] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Grade state per student: studentId -> { grade, feedback }
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filters & Search
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch submissions
      const subRes = await assignmentsApi.submissions(assignmentId, decodedCourse, decodedGroup);
      const asgn = subRes.data?.assignment;
      setAssignment(asgn);
      const rows = subRes.data?.studentRows || [];
      setStudentRows(rows);

      // Initialize grade inputs
      const initGrades: Record<string, { grade: string; feedback: string }> = {};
      for (const r of rows) {
        initGrades[r.student.id] = {
          grade: r.submission?.grade !== null && r.submission?.grade !== undefined ? String(r.submission.grade) : '',
          feedback: r.submission?.feedback || '',
        };
      }
      setGrades(initGrades);

      // If quiz, also fetch quiz questions
      if (asgn?.type === 'QUIZ') {
        const qRes = await assignmentsApi.getQuestions(assignmentId);
        const qs = (qRes.data as any[] || []).sort((a, b) => a.orderIndex - b.orderIndex);
        setQuestions(qs);
      }
    } catch (err: any) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, decodedCourse, decodedGroup]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveGrade = async (submissionId: string, studentId: string) => {
    const g = grades[studentId];
    if (!g || g.grade.trim() === '') {
      toast.error('Please enter a grade');
      return;
    }
    const numGrade = Number(g.grade);
    if (isNaN(numGrade) || numGrade < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }
    const maxGrade = assignment?.maxGrade ?? 100;
    if (numGrade > maxGrade) {
      toast.error(`Grade cannot exceed max grade of ${maxGrade}`);
      return;
    }

    setSavingId(submissionId);
    try {
      await assignmentsApi.grade(submissionId, numGrade, g.feedback);
      toast.success('Grade saved successfully!');

      // Update in place so no UI blink or state reset occurs
      setStudentRows(prevRows =>
        prevRows.map(r => {
          if (r.student.id === studentId && r.submission) {
            return {
              ...r,
              submission: {
                ...r.submission,
                grade: numGrade,
                feedback: g.feedback,
              },
            };
          }
          return r;
        })
      );
    } catch {
      toast.error('Failed to save grade');
    } finally {
      setSavingId(null);
    }
  };

  // Stats calculation
  const totalStudents = studentRows.length;
  const submittedCount = studentRows.filter(r => r.submitted).length;
  const gradedCount = studentRows.filter(r => r.submitted && r.submission?.grade !== null && r.submission?.grade !== undefined).length;
  const needsGradingCount = submittedCount - gradedCount;
  const notSubmittedCount = totalStudents - submittedCount;

  // Filtered students
  const filteredRows = useMemo(() => {
    return studentRows.filter(row => {
      // Status filter
      if (filter === 'SUBMITTED' && !row.submitted) return false;
      if (filter === 'NOT_SUBMITTED' && row.submitted) return false;
      if (filter === 'GRADED') {
        if (!row.submitted || row.submission?.grade === null || row.submission?.grade === undefined) return false;
      }
      if (filter === 'NEEDS_GRADING') {
        if (!row.submitted || (row.submission?.grade !== null && row.submission?.grade !== undefined)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (row.student?.name || '').toLowerCase();
        const email = (row.student?.email || '').toLowerCase();
        const studentId = (row.student?.studentId || '').toLowerCase();
        return name.includes(q) || email.includes(q) || studentId.includes(q);
      }

      return true;
    });
  }, [studentRows, filter, searchQuery]);

  const maxGrade = assignment?.maxGrade ?? 100;
  const isQuiz = assignment?.type === 'QUIZ';

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* Top Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link
            href={`/teacher/courses/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedGroup)}`}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 0 }}
          >
            <ArrowLeft size={16} /> Back to {decodedGroup}
          </Link>

          {isQuiz && (
            <Link
              href={`/teacher/courses/${encodeURIComponent(decodedCourse)}/${encodeURIComponent(decodedGroup)}/quiz/${assignmentId}`}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Edit3 size={14} /> Edit Quiz Questions
            </Link>
          )}
        </div>

        {/* Assignment Hero Header (SOLID OPAQUE CARD, NO GLASS OVERLAP) */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{
                  background: isQuiz ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)',
                  color: isQuiz ? '#818cf8' : '#fbbf24',
                  border: `1px solid ${isQuiz ? 'rgba(99,102,241,0.4)' : 'rgba(245,158,11,0.4)'}`,
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  {isQuiz ? <ClipboardList size={13} /> : <BookOpen size={13} />}
                  {isQuiz ? 'QUIZ SUBMISSIONS' : 'HOMEWORK SUBMISSIONS'}
                </span>

                <span style={{
                  background: assignment?.isPublished ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  color: assignment?.isPublished ? '#34d399' : '#94a3b8',
                  border: `1px solid ${assignment?.isPublished ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {assignment?.isPublished ? '● Published' : '○ Draft'}
                </span>

                <span style={{
                  background: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  Max Grade: <strong style={{ color: '#fff' }}>{maxGrade}</strong>
                </span>
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
                {assignment?.title || 'Assignment Submissions'}
              </h1>

              {assignment?.description && (
                <p style={{ color: '#94a3b8', fontSize: 14, margin: '6px 0 0', lineHeight: 1.5 }}>
                  {assignment.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 13, color: '#64748b' }}>
                <span>Group: <strong style={{ color: '#cbd5e1' }}>{decodedGroup}</strong></span>
                <span>•</span>
                <span>Course: <strong style={{ color: '#cbd5e1' }}>{decodedCourse}</strong></span>
                {assignment?.dueDate && (
                  <>
                    <span>•</span>
                    <span>Due: <strong style={{ color: '#cbd5e1' }}>{format(new Date(assignment.dueDate), 'MMM d, yyyy HH:mm')}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            marginTop: 20,
            paddingTop: 18,
            borderTop: '1px solid #1e293b',
          }}>
            <div style={{ background: '#131d33', padding: '12px 14px', borderRadius: 10, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Enrolled</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>{totalStudents}</div>
            </div>
            <div style={{ background: '#131d33', padding: '12px 14px', borderRadius: 10, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Submitted</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                {submittedCount} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>/ {totalStudents}</span>
              </div>
            </div>
            <div style={{ background: '#131d33', padding: '12px 14px', borderRadius: 10, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Graded</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 2 }}>{gradedCount}</div>
            </div>
            <div style={{ background: '#131d33', padding: '12px 14px', borderRadius: 10, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Needs Grading</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: needsGradingCount > 0 ? '#f59e0b' : '#64748b', marginTop: 2 }}>
                {needsGradingCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search Control */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL' as FilterStatus, label: 'All', count: totalStudents },
              { id: 'SUBMITTED' as FilterStatus, label: 'Submitted', count: submittedCount },
              { id: 'NEEDS_GRADING' as FilterStatus, label: 'Needs Grading', count: needsGradingCount },
              { id: 'GRADED' as FilterStatus, label: 'Graded', count: gradedCount },
              { id: 'NOT_SUBMITTED' as FilterStatus, label: 'Not Submitted', count: notSubmittedCount },
            ].map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: active ? '#6366f1' : '#1e293b',
                    color: active ? '#fff' : '#94a3b8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '1px 6px',
                    fontSize: 10,
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search student or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '6px 12px 6px 32px',
                fontSize: 13,
                color: '#f8fafc',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Main Content: Student Submissions List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
            <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            <Users size={40} style={{ color: '#475569', marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
              No students found
            </h3>
            <p style={{ fontSize: 13, margin: 0 }}>
              {searchQuery ? 'Try changing your search keywords or filter.' : 'No students match the selected filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredRows.map((row) => {
              const student = row.student;
              const submission = row.submission;
              const isSubmitted = row.submitted;
              const hasGrade = submission && submission.grade !== null && submission.grade !== undefined;
              const currentGrade = hasGrade ? submission.grade : null;
              const gInput = grades[student.id] || { grade: '', feedback: '' };

              // Parse quiz answers if quiz
              let parsedAnswers: Record<string, string> = {};
              if (isQuiz && submission?.content) {
                try {
                  parsedAnswers = JSON.parse(submission.content);
                } catch {
                  parsedAnswers = {};
                }
              }

              return (
                <div
                  key={student.id}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Student Header Bar */}
                  <div style={{
                    padding: '16px 20px',
                    background: '#131d33',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}>
                    {/* Student Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: isSubmitted ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                        border: `1.5px solid ${isSubmitted ? '#10b981' : '#64748b'}`,
                        color: isSubmitted ? '#34d399' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}>
                        {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                            {student.name}
                          </span>
                          {student.studentId && (
                            <span style={{
                              background: 'rgba(99,102,241,0.18)',
                              color: '#818cf8',
                              border: '1px solid rgba(99,102,241,0.35)',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}>
                              ID: {student.studentId}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                          {student.email}
                        </div>
                      </div>
                    </div>

                    {/* Status & Submission Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {isSubmitted ? (
                        <>
                          <span style={{
                            background: 'rgba(16,185,129,0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16,185,129,0.3)',
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}>
                            <CheckCircle2 size={13} />
                            Submitted {submission?.submittedAt ? format(new Date(submission.submittedAt), 'MMM d, HH:mm') : ''}
                          </span>

                          {hasGrade ? (
                            <span style={{
                              background: 'rgba(56,189,248,0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56,189,248,0.3)',
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                            }}>
                              Graded: {currentGrade} / {maxGrade}
                            </span>
                          ) : (
                            <span style={{
                              background: 'rgba(245,158,11,0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245,158,11,0.3)',
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}>
                              <Clock size={13} /> Needs Grading
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{
                          background: 'rgba(148,163,184,0.1)',
                          color: '#94a3b8',
                          border: '1px solid rgba(148,163,184,0.2)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}>
                          <Clock size={13} /> Not Submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission Body */}
                  <div style={{ padding: '20px' }}>
                    {isSubmitted ? (
                      <div>
                        {/* Grading Controls Bar (Available ALL THE TIME, before AND after grading) */}
                        <div style={{
                          background: '#162238',
                          border: '1px solid #233454',
                          borderRadius: 12,
                          padding: '14px 16px',
                          marginBottom: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 14,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Award size={18} style={{ color: '#818cf8' }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                                Teacher Evaluation & Grade
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {hasGrade ? 'Grade already saved. You can adjust it at any time.' : 'Assign score and optional feedback below.'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number"
                                min={0}
                                max={maxGrade}
                                placeholder="Grade"
                                value={gInput.grade}
                                onChange={e => {
                                  const val = e.target.value;
                                  setGrades(prev => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], grade: val },
                                  }));
                                }}
                                style={{
                                  width: 80,
                                  background: '#0f172a',
                                  border: '1px solid #334155',
                                  borderRadius: 8,
                                  padding: '7px 10px',
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: '#f8fafc',
                                  textAlign: 'center',
                                }}
                              />
                              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/ {maxGrade}</span>
                            </div>

                            <input
                              type="text"
                              placeholder="Feedback / notes for student..."
                              value={gInput.feedback}
                              onChange={e => {
                                const val = e.target.value;
                                setGrades(prev => ({
                                  ...prev,
                                  [student.id]: { ...prev[student.id], feedback: val },
                                }));
                              }}
                              style={{
                                minWidth: 200,
                                maxWidth: 300,
                                flex: 1,
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: 8,
                                padding: '7px 12px',
                                fontSize: 13,
                                color: '#f8fafc',
                              }}
                            />

                            <button
                              onClick={() => handleSaveGrade(submission.id, student.id)}
                              disabled={savingId === submission.id}
                              style={{
                                background: hasGrade ? '#3b82f6' : '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '7px 16px',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {savingId === submission.id ? (
                                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                              ) : (
                                <>
                                  <Check size={14} />
                                  {hasGrade ? 'Update Grade' : 'Save Grade'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* QUIZ STUDENT ANSWERS: ALWAYS VISIBLE ALL THE TIME (BEFORE & AFTER GRADING) */}
                        {isQuiz && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid #1e293b',
                              paddingBottom: 8,
                            }}>
                              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ClipboardList size={16} style={{ color: '#818cf8' }} />
                                Student Quiz Answers ({questions.length} Questions)
                              </h4>
                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                Always visible
                              </span>
                            </div>

                            {questions.length === 0 ? (
                              <div style={{ padding: '16px', color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                                No questions found in this quiz.
                              </div>
                            ) : (
                              questions.map((q, qIndex) => {
                                const studentAns = parsedAnswers[q.id];
                                const isMCQ = q.type === 'MULTIPLE_CHOICE';
                                const isCorrect = isMCQ && q.correctAnswer && studentAns === q.correctAnswer;
                                const isWrong = isMCQ && q.correctAnswer && studentAns && studentAns !== q.correctAnswer;

                                return (
                                  <div
                                    key={q.id}
                                    style={{
                                      background: '#131d33',
                                      border: '1px solid #1e293b',
                                      borderRadius: 12,
                                      padding: '16px',
                                      borderLeft: `4px solid ${
                                        !isMCQ ? '#818cf8' : isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#64748b'
                                      }`,
                                    }}
                                  >
                                    {/* Question Header & Points */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                          background: '#1e293b',
                                          color: '#f8fafc',
                                          fontSize: 12,
                                          fontWeight: 700,
                                          padding: '2px 8px',
                                          borderRadius: 6,
                                        }}>
                                          Q{qIndex + 1}
                                        </span>
                                        <span style={{
                                          fontSize: 11,
                                          color: !isMCQ ? '#818cf8' : '#94a3b8',
                                          fontWeight: 600,
                                        }}>
                                          {isMCQ ? 'Multiple Choice' : 'Open Text Question'}
                                        </span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                                          {q.points ?? 1} pt{q.points !== 1 ? 's' : ''}
                                        </span>
                                        {isMCQ && (
                                          isCorrect ? (
                                            <span style={{
                                              background: 'rgba(16,185,129,0.15)',
                                              color: '#34d399',
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              fontSize: 11,
                                              fontWeight: 700,
                                            }}>
                                              ✓ Correct
                                            </span>
                                          ) : isWrong ? (
                                            <span style={{
                                              background: 'rgba(239,68,68,0.15)',
                                              color: '#f87171',
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              fontSize: 11,
                                              fontWeight: 700,
                                            }}>
                                              ✗ Incorrect
                                            </span>
                                          ) : (
                                            <span style={{
                                              background: 'rgba(148,163,184,0.15)',
                                              color: '#94a3b8',
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              fontSize: 11,
                                            }}>
                                              Not answered
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>

                                    {/* Question Text */}
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12, lineHeight: 1.5 }}>
                                      <MathText text={q.questionText} />
                                    </div>

                                    {/* Question Image if present */}
                                    {q.questionImageUrl && (
                                      <div style={{ marginBottom: 12 }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={q.questionImageUrl}
                                          alt="Question illustration"
                                          style={{ maxWidth: 360, maxHeight: 200, borderRadius: 8, border: '1px solid #334155' }}
                                        />
                                      </div>
                                    )}

                                    {/* Multiple Choice Options Display */}
                                    {isMCQ && q.options && (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, marginTop: 10 }}>
                                        {q.options.map((opt: any) => {
                                          const isSelected = studentAns === opt.id;
                                          const isRightOpt = q.correctAnswer === opt.id;

                                          let optBg = '#0f172a';
                                          let optBorder = '#1e293b';
                                          let optColor = '#cbd5e1';

                                          if (isSelected && isRightOpt) {
                                            optBg = 'rgba(16,185,129,0.15)';
                                            optBorder = '#10b981';
                                            optColor = '#34d399';
                                          } else if (isSelected && !isRightOpt) {
                                            optBg = 'rgba(239,68,68,0.15)';
                                            optBorder = '#ef4444';
                                            optColor = '#f87171';
                                          } else if (isRightOpt && !isSelected) {
                                            optBg = 'rgba(16,185,129,0.06)';
                                            optBorder = 'rgba(16,185,129,0.5)';
                                            optColor = '#34d399';
                                          }

                                          return (
                                            <div
                                              key={opt.id}
                                              style={{
                                                background: optBg,
                                                border: `1px solid ${optBorder}`,
                                                borderRadius: 8,
                                                padding: '9px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: optColor }}>
                                                <span style={{ fontWeight: 700 }}>({opt.id})</span>
                                                <span><MathText text={opt.text} /></span>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {isSelected && (
                                                  <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: isRightOpt ? '#10b981' : '#ef4444',
                                                    color: '#fff',
                                                  }}>
                                                    Student Choice
                                                  </span>
                                                )}
                                                {isRightOpt && !isSelected && (
                                                  <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: 'rgba(16,185,129,0.2)',
                                                    color: '#34d399',
                                                  }}>
                                                    Correct Answer
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Text Question Answer Box */}
                                    {!isMCQ && (
                                      <div style={{ marginTop: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                          Student Answer:
                                        </div>
                                        <div style={{
                                          background: '#090d16',
                                          border: '1px solid #1e293b',
                                          borderRadius: 8,
                                          padding: '12px 14px',
                                          fontSize: 13,
                                          color: studentAns ? '#f8fafc' : '#64748b',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word',
                                          lineHeight: 1.6,
                                          fontStyle: studentAns ? 'normal' : 'italic',
                                        }}>
                                          {studentAns || 'No answer submitted by student.'}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        {/* HOMEWORK SUBMISSION CONTENT */}
                        {!isQuiz && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                              Homework Content & Attachments
                            </div>
                            {submission?.content ? (
                              <div style={{
                                background: '#131d33',
                                border: '1px solid #1e293b',
                                borderRadius: 10,
                                padding: '14px 16px',
                                fontSize: 13,
                                color: '#cbd5e1',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                marginBottom: 12,
                              }}>
                                {submission.content}
                              </div>
                            ) : (
                              <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
                                No written text provided.
                              </div>
                            )}

                            {submission?.attachments && submission.attachments.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                                  Submitted Files ({submission.attachments.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {submission.attachments.map((fileUrl: string, fIdx: number) => {
                                    const fileName = fileUrl.split('/').pop() || `Attachment ${fIdx + 1}`;
                                    return (
                                      <a
                                        key={fIdx}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          background: '#1e293b',
                                          border: '1px solid #334155',
                                          borderRadius: 8,
                                          padding: '8px 12px',
                                          fontSize: 12,
                                          color: '#38bdf8',
                                          textDecoration: 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                        }}
                                      >
                                        <FileText size={14} />
                                        <span>{fileName}</span>
                                        <ExternalLink size={12} style={{ color: '#64748b' }} />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        padding: '16px',
                        color: '#64748b',
                        fontSize: 13,
                        fontStyle: 'italic',
                        textAlign: 'center',
                      }}>
                        Student has not submitted this assignment yet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
