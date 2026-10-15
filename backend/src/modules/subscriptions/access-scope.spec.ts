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
    expect(canAccessCourseContent(enrollment, 'Chapter 1', 'Any lesson', 'teacher-1')).toBe(true);
    expect(canAccessCourseContent(enrollment, 'Chapter 2', 'Lesson A', 'teacher-1')).toBe(true);
  });

  it('matches a selected lesson by both chapter and lesson name', () => {
    expect(canAccessCourseContent(enrollment, 'Chapter 2', 'Lesson A', 'teacher-1')).toBe(true);
    expect(canAccessCourseContent(enrollment, 'Chapter 3', 'Lesson A', 'teacher-1')).toBe(false);
    expect(canAccessCourseContent(enrollment, 'Chapter 2', 'Lesson B', 'teacher-1')).toBe(false);
  });

  it('restricts scoped access to content owned by the selected teacher', () => {
    expect(canAccessCourseContent(enrollment, 'Chapter 1', 'Lesson A', 'teacher-1')).toBe(true);
    expect(canAccessCourseContent(enrollment, 'Chapter 1', 'Lesson A', 'teacher-2')).toBe(false);
    expect(canAccessCourseContent(enrollment, 'Chapter 1', 'Lesson A')).toBe(false);
  });

  it('keeps legacy lesson-name scopes readable', () => {
    const legacyEnrollment = {
      ...enrollment,
      accessScope: { chapters: [], lessons: ['Old Lesson'] },
    } as CourseEnrollment;
    expect(canAccessCourseContent(legacyEnrollment, 'Legacy Chapter', 'Old Lesson', 'teacher-1')).toBe(true);
  });

  it('rejects expired chapter access and reports its status', () => {
    const expiredEnrollment = {
      ...enrollment,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    } as CourseEnrollment;
    expect(isEnrollmentExpired(expiredEnrollment)).toBe(true);
    expect(() => assertCourseContentAccess(expiredEnrollment, 'Chapter 1', 'Lesson A', 'teacher-1'))
      .toThrow(ForbiddenException);
  });
});
