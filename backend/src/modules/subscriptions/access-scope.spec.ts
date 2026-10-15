import { ForbiddenException } from '@nestjs/common';
import { CodeType } from './entities/subscription-code.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { assertCourseContentAccess, canAccessCourseContent, isEnrollmentExpired } from './access-scope';

describe('course enrollment content scope', () => {
  const enrollment = {
    codeType: CodeType.CHAPTER,
    teacherId: 'teacher-1',
    expiresAt: null,
    accessScope: {
      chapters: ['Chapter 1'],
      lessons: [{ chapterName: 'Chapter 2', lessonName: 'Lesson A' }],
    },
  } as CourseEnrollment;

  it('allows all lessons in an explicitly selected chapter', () => {
    expect(canAccessCourseContent(enrollment, 'Chapter 1', 'Any lesson')).toBe(true);
    expect(canAccessCourseContent(enrollment, 'Chapter 2', 'Lesson A')).toBe(true);
  });

  it('matches a selected lesson by both chapter and lesson name', () => {
    expect(canAccessCourseContent(enrollment, 'Chapter 2', 'Lesson A')).toBe(true);
    expect(canAccessCourseContent(enrollment, 'Chapter 3', 'Lesson A')).toBe(false);
    expect(canAccessCourseContent(enrollment, 'Chapter 2', 'Lesson B')).toBe(false);
  });

  it('allows scoped content in the enrolled group regardless of legacy content owner IDs', () => {
    expect(canAccessCourseContent(enrollment, 'Chapter 1', 'Lesson A')).toBe(true);
  });

  it('keeps legacy lesson-name scopes readable', () => {
    const legacyEnrollment = {
      ...enrollment,
      accessScope: { chapters: [], lessons: ['Old Lesson'] },
    } as CourseEnrollment;
    expect(canAccessCourseContent(legacyEnrollment, 'Legacy Chapter', 'Old Lesson')).toBe(true);
  });

  it('rejects expired chapter access and reports its status', () => {
    const expiredEnrollment = {
      ...enrollment,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    } as CourseEnrollment;
    expect(isEnrollmentExpired(expiredEnrollment)).toBe(true);
    expect(() => assertCourseContentAccess(expiredEnrollment, 'Chapter 1', 'Lesson A'))
      .toThrow(ForbiddenException);
  });
});
