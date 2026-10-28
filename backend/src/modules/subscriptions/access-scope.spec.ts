import { ForbiddenException } from '@nestjs/common';
import { CodeType } from './entities/subscription-code.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import {
  assertCourseContentAccess,
  assertCourseContentAccessAcrossEnrollments,
  canAccessCourseContent,
  canAccessCourseContentAcrossEnrollments,
  isEnrollmentExpired,
} from './access-scope';

describe('course enrollment content scope', () => {
  const chapter1Enrollment = {
    id: 'ch-1',
    codeType: CodeType.CHAPTER,
    teacherId: 'teacher-1',
    expiresAt: null,
    accessScope: {
      chapters: ['Chapter 1'],
      lessons: [{ chapterName: 'Chapter 2', lessonName: 'Lesson A' }],
    },
  } as unknown as CourseEnrollment;

  it('allows all lessons in an explicitly selected chapter', () => {
    expect(canAccessCourseContent(chapter1Enrollment, 'Chapter 1', 'Any lesson')).toBe(true);
    expect(canAccessCourseContent(chapter1Enrollment, 'Chapter 2', 'Lesson A')).toBe(true);
  });

  it('matches a selected lesson by both chapter and lesson name', () => {
    expect(canAccessCourseContent(chapter1Enrollment, 'Chapter 2', 'Lesson A')).toBe(true);
    expect(canAccessCourseContent(chapter1Enrollment, 'Chapter 3', 'Lesson A')).toBe(false);
    expect(canAccessCourseContent(chapter1Enrollment, 'Chapter 2', 'Lesson B')).toBe(false);
  });

  it('allows scoped content in the enrolled group regardless of legacy content owner IDs', () => {
    expect(canAccessCourseContent(chapter1Enrollment, 'Chapter 1', 'Lesson A')).toBe(true);
  });

  it('keeps legacy lesson-name scopes readable', () => {
    const legacyEnrollment = {
      ...chapter1Enrollment,
      accessScope: { chapters: [], lessons: ['Old Lesson'] },
    } as unknown as CourseEnrollment;
    expect(canAccessCourseContent(legacyEnrollment, 'Legacy Chapter', 'Old Lesson')).toBe(true);
  });

  it('rejects expired chapter access and reports its status', () => {
    const expiredEnrollment = {
      ...chapter1Enrollment,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    } as unknown as CourseEnrollment;
    expect(isEnrollmentExpired(expiredEnrollment)).toBe(true);
    expect(() => assertCourseContentAccess(expiredEnrollment, 'Chapter 1', 'Lesson A'))
      .toThrow(ForbiddenException);
  });

  describe('multi-enrollment access (when student has single lesson code + monthly code)', () => {
    const activeMonthlyEnrollment = {
      id: 'monthly-1',
      codeType: CodeType.TIMED,
      teacherId: 'teacher-1',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
      accessScope: null,
    } as unknown as CourseEnrollment;

    it('unlocks all chapters when student has an active TIMED (monthly) code alongside a CHAPTER code', () => {
      const enrollments = [chapter1Enrollment, activeMonthlyEnrollment];
      // Chapter 1 is accessible
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 1', 'Lesson 1')).toBe(true);
      // New chapters that were not in chapter 1 are now also fully accessible!
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 2', 'Any new lesson')).toBe(true);
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 5', 'Future lesson')).toBe(true);
    });

    it('merges access when student has multiple chapter codes', () => {
      const chapter2Enrollment = {
        id: 'ch-2',
        codeType: CodeType.CHAPTER,
        teacherId: 'teacher-1',
        expiresAt: null,
        accessScope: {
          chapters: ['Chapter 2'],
          lessons: [],
        },
      } as unknown as CourseEnrollment;

      const enrollments = [chapter1Enrollment, chapter2Enrollment];
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 1', 'Lesson 1')).toBe(true);
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 2', 'Lesson 2')).toBe(true);
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 3', 'Lesson 3')).toBe(false);
    });

    it('falls back to active chapter code when monthly code has expired', () => {
      const expiredMonthlyEnrollment = {
        id: 'monthly-old',
        codeType: CodeType.TIMED,
        teacherId: 'teacher-1',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        accessScope: null,
      } as unknown as CourseEnrollment;

      const enrollments = [chapter1Enrollment, expiredMonthlyEnrollment];
      // Chapter 1 was purchased permanently, so it remains accessible
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 1', 'Lesson 1')).toBe(true);
      // Chapter 2 was only covered by the expired monthly code, so it is blocked
      expect(canAccessCourseContentAcrossEnrollments(enrollments, 'Chapter 2', 'Lesson 2')).toBe(false);
    });

    it('throws ForbiddenException when all enrollments are expired', () => {
      const expired1 = {
        ...chapter1Enrollment,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      } as unknown as CourseEnrollment;
      const enrollments = [expired1];
      expect(() => assertCourseContentAccessAcrossEnrollments(enrollments, 'Chapter 1', 'Lesson 1'))
        .toThrow('This course access has expired');
    });
  });
});
