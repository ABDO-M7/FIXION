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
