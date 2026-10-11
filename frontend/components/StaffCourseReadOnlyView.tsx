'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardList, FileText, Play, X } from 'lucide-react';
import StudentCourseHierarchy from '@/components/StudentCourseHierarchy';
import InteractiveCourseVideoPlayer, { type InteractiveCourseVideo } from '@/components/InteractiveCourseVideoPlayer';
import { assignmentsApi, videosApi } from '@/lib/api';

type CourseVideo = InteractiveCourseVideo & {
  chapterName?: string | null;
  lessonName?: string | null;
  contentOrder?: number;
  createdAt?: string;
  attachments?: string[];
};

type CourseAssignment = {
  id: string;
  type: 'HOMEWORK' | 'QUIZ';
  title: string;
  description?: string | null;
  maxGrade?: number;
  chapterName?: string | null;
  lessonName?: string | null;
  contentOrder?: number;
  dueDate?: string | null;
  attachments?: string[];
  createdAt?: string;
};

type QuizQuestion = {
  id: string;
  questionText: string;
  questionImageUrl?: string | null;
  type: string;
  options?: Array<{ id: string; text: string; imageUrl?: string }>;
};

export default function StaffCourseReadOnlyView({
  courseName,
  groupName,
}: {
  courseName: string;
  groupName: string;
}) {
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeVideo, setActiveVideo] = useState<CourseVideo | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      videosApi.teacherList(courseName, groupName),
      assignmentsApi.list(courseName, groupName),
    ]).then(([videoResponse, assignmentResponse]) => {
      if (cancelled) return;
      setVideos(Array.isArray(videoResponse.data) ? videoResponse.data : []);
      setAssignments(
        (Array.isArray(assignmentResponse.data) ? assignmentResponse.data : [])
          .filter((assignment: CourseAssignment & { isPublished?: boolean }) => assignment.isPublished),
      );
    }).catch(error => {
      if (cancelled) return;
      setLoadError(error?.response?.data?.message || 'تعذر تحميل محتوى الكورس.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [courseName, groupName]);

  if (loading) {
    return (
      <div role="status" style={{ display: 'grid', placeItems: 'center', padding: 56 }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (loadError) {
    return <div className="card" role="alert" style={{ padding: 24, color: 'var(--danger, #ef4444)' }}>{loadError}</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
        <CheckCircle2 size={15} aria-hidden="true" />
        <span>عرض الكورس للمعاينة — بدون صلاحية تعديل أو إضافة محتوى</span>
      </div>
      <StudentCourseHierarchy
        enrollmentId=""
        assignments={assignments.map(assignment => ({
          ...assignment,
          description: assignment.description || undefined,
          maxGrade: assignment.maxGrade || 100,
          submission: null,
        }))}
        videos={videos}
        onVideoClick={setActiveVideo}
        renderAssignment={assignment => (
          <ReadOnlyAssignmentCard
            key={assignment.id}
            assignment={assignment as CourseAssignment}
          />
        )}
      />
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`معاينة ${activeVideo.title}`}
          onClick={event => {
            if (event.target === event.currentTarget) setActiveVideo(null);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.82)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <div style={{ width: '100%', maxWidth: 900, position: 'relative' }}>
            <button
              className="icon-btn"
              onClick={() => setActiveVideo(null)}
              aria-label="إغلاق معاينة الفيديو"
              style={{ position: 'absolute', top: -44, insetInlineEnd: 0, zIndex: 1, width: 36, height: 36 }}
            >
              <X size={18} />
            </button>
            <InteractiveCourseVideoPlayer video={activeVideo} preview />
          </div>
        </div>
      )}
    </>
  );
}

function ReadOnlyAssignmentCard({ assignment }: { assignment: CourseAssignment }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState('');

  const openQuiz = async () => {
    setShowQuiz(true);
    setLoadingQuestions(true);
    setQuestionError('');
    try {
      const response = await assignmentsApi.getQuestions(assignment.id);
      setQuestions(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      setQuestionError(error instanceof Error ? error.message : 'تعذر تحميل أسئلة الكويز.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  return (
    <>
      <article className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: assignment.type === 'QUIZ' ? 'rgba(99,102,241,.12)' : 'rgba(245,158,11,.12)',
          color: assignment.type === 'QUIZ' ? '#818cf8' : '#f59e0b',
        }}>
          {assignment.type === 'QUIZ' ? <ClipboardList size={19} /> : <BookOpen size={19} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 14 }}>{assignment.title}</strong>
          {assignment.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: '5px 0 0' }}>{assignment.description}</p>
          )}
          {assignment.dueDate && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 0' }}>
              موعد التسليم: {new Date(assignment.dueDate).toLocaleString('ar-EG')}
            </p>
          )}
          {assignment.attachments?.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {assignment.attachments.map((url, index) => (
                <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  <FileText size={13} /> عرض الملف {index + 1}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {assignment.type === 'QUIZ' && (
          <button onClick={openQuiz} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
            <Play size={13} /> معاينة الأسئلة
          </button>
        )}
      </article>
      {showQuiz && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`معاينة كويز ${assignment.title}`}
          onClick={event => {
            if (event.target === event.currentTarget) setShowQuiz(false);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,.78)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <section className="card" style={{ width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>معاينة فقط</span>
                <h2 style={{ fontSize: 19, margin: '4px 0 0' }}>{assignment.title}</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowQuiz(false)} aria-label="إغلاق معاينة الكويز">
                <X size={17} />
              </button>
            </div>
            {loadingQuestions ? (
              <div role="status" style={{ display: 'grid', placeItems: 'center', padding: 32 }}><span className="spinner" /></div>
            ) : questionError ? (
              <div role="alert" style={{ color: 'var(--danger, #ef4444)' }}>{questionError}</div>
            ) : questions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد أسئلة في هذا الكويز بعد.</p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {questions.map((question, index) => (
                  <article key={question.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <strong style={{ display: 'block', lineHeight: 1.6, marginBottom: 10 }}>{index + 1}. {question.questionText}</strong>
                    {question.questionImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={question.questionImageUrl} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: 260, objectFit: 'contain', marginBottom: 12 }} />
                    )}
                    {question.type === 'MULTIPLE_CHOICE' && (
                      <div style={{ display: 'grid', gap: 7 }}>
                        {(question.options || []).map(option => (
                          <div key={option.id} style={{ padding: '9px 11px', borderRadius: 8, background: 'rgba(255,255,255,.035)', color: 'var(--text-secondary)', fontSize: 13 }}>
                            <strong style={{ color: 'var(--primary-light)', marginInlineEnd: 8 }}>{option.id}</strong>
                            {option.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {question.type !== 'MULTIPLE_CHOICE' && (
                      <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                        سؤال إجابة نصية
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
