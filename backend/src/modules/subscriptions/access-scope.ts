import { ForbiddenException } from '@nestjs/common';
import { CodeType } from './entities/subscription-code.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';

type LessonScope = string | { chapterName: string; lessonName: string };

export function isEnrollmentExpired(enrollment: CourseEnrollment, now = new Date()): boolean {
  return Boolean(enrollment.expiresAt && enrollment.expiresAt.getTime() <= now.getTime());
}

export function assertEnrollmentActive(enrollment: CourseEnrollment): void {
  if (isEnrollmentExpired(enrollment)) {
    throw new ForbiddenException('This course access has expired');
  }
}

export function canAccessCourseContent(
  enrollment: CourseEnrollment,
  chapterName?: string | null,
  lessonName?: string | null,
): boolean {
  if (isEnrollmentExpired(enrollment)) return false;
  if ((enrollment.codeType ?? CodeType.TIMED) !== CodeType.CHAPTER) return true;

  const scope = enrollment.accessScope;
  if (!scope) return false;
  const chapter = chapterName?.trim() || '';
  const lesson = lessonName?.trim() || '';
  if (chapter && scope.chapters?.includes(chapter)) return true;

  return (scope.lessons as LessonScope[] | undefined)?.some(item => {
    if (typeof item === 'string') return item === lesson;
    return item.chapterName === chapter && item.lessonName === lesson;
  }) ?? false;
}

export function assertCourseContentAccess(
  enrollment: CourseEnrollment,
  chapterName?: string | null,
  lessonName?: string | null,
): void {
  assertEnrollmentActive(enrollment);
  if (!canAccessCourseContent(enrollment, chapterName, lessonName)) {
    throw new ForbiddenException('This content is not included in your course access');
  }
}

/**
 * Checks content access across multiple enrollments for the same student/course/group.
 * If ANY non-expired enrollment provides access (e.g. an active monthly TIMED code,
 * or a CHAPTER code that covers the chapter), access is granted.
 */
export function canAccessCourseContentAcrossEnrollments(
  enrollments: CourseEnrollment[],
  chapterName?: string | null,
  lessonName?: string | null,
  now = new Date(),
): boolean {
  if (!enrollments || enrollments.length === 0) return false;

  const active = enrollments.filter(e => !isEnrollmentExpired(e, now));
  if (active.length === 0) return false;

  // 1. Any active TIMED code grants full access to all chapters and lessons
  if (active.some(e => (e.codeType ?? CodeType.TIMED) === CodeType.TIMED)) {
    return true;
  }

  // 2. Any active SNAPSHOT code grants full access
  if (active.some(e => e.codeType === CodeType.SNAPSHOT)) {
    return true;
  }

  // 3. Otherwise, check across all active CHAPTER enrollments
  const chapter = chapterName?.trim() || '';
  const lesson = lessonName?.trim() || '';

  for (const e of active) {
    if (e.codeType === CodeType.CHAPTER && e.accessScope) {
      if (chapter && e.accessScope.chapters?.includes(chapter)) return true;
      const matchLesson = (e.accessScope.lessons as LessonScope[] | undefined)?.some(item => {
        if (typeof item === 'string') return item === lesson;
        return item.chapterName === chapter && item.lessonName === lesson;
      });
      if (matchLesson) return true;
    }
  }

  return false;
}

export function assertCourseContentAccessAcrossEnrollments(
  enrollments: CourseEnrollment[],
  chapterName?: string | null,
  lessonName?: string | null,
  now = new Date(),
): void {
  if (!enrollments || enrollments.length === 0) {
    throw new ForbiddenException('You are not enrolled in this course group');
  }

  const active = enrollments.filter(e => !isEnrollmentExpired(e, now));
  if (active.length === 0) {
    throw new ForbiddenException('This course access has expired');
  }

  if (!canAccessCourseContentAcrossEnrollments(enrollments, chapterName, lessonName, now)) {
    throw new ForbiddenException('This content is not included in your course access');
  }
}
