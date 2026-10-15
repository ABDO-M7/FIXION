import { ForbiddenException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { AssignmentsService } from './assignments.service';
import { Assignment } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

describe('AssignmentsService staff access', () => {
  function createService(repositories: {
    assignments: Record<string, jest.Mock>;
    submissions: Record<string, jest.Mock>;
    enrollments?: Record<string, jest.Mock>;
    users?: Record<string, jest.Mock>;
  }) {
    return new AssignmentsService(
      repositories.assignments as unknown as Repository<Assignment>,
      repositories.submissions as unknown as Repository<AssignmentSubmission>,
      {} as never,
      (repositories.enrollments || {}) as unknown as Repository<CourseEnrollment>,
      (repositories.users || {}) as unknown as Repository<User>,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { bumpVersion: jest.fn() } as unknown as RedisCacheService,
    );
  }

  it('returns only enrolled students and their submissions for the requested assignment and group', async () => {
    const enrolledIds = ['student-1', 'student-2'];
    const enrollmentQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(enrolledIds.map(studentId => ({ studentId }))),
    };
    const assignment = {
      id: 'assignment-1',
      courseName: 'Physics',
      groupName: 'Group 1',
      teacherId: 'teacher-1',
    };
    const assignments = { findOne: jest.fn().mockResolvedValue(assignment) };
    const submission = {
      id: 'submission-1',
      assignmentId: assignment.id,
      studentId: enrolledIds[0],
      student: { name: 'Student One', email: 'one@example.com', studentId: 'S00001' },
      content: 'Submitted answer',
      attachments: [],
      grade: null,
      feedback: null,
      submittedAt: new Date(),
    };
    const submissions = { find: jest.fn().mockResolvedValue([submission]) };
    const enrollments = { createQueryBuilder: jest.fn().mockReturnValue(enrollmentQuery) };
    const users = {
      findByIds: jest.fn().mockResolvedValue([
        { id: enrolledIds[0], name: 'Student One', email: 'one@example.com' },
        { id: enrolledIds[1], name: 'Student Two', email: 'two@example.com' },
      ]),
    };
    const service = createService({ assignments, submissions, enrollments, users });

    const result = await service.getAssignmentWithSubmissions(
      assignment.id,
      assignment.courseName,
      assignment.groupName,
      { id: 'admin-1', role: UserRole.ADMIN } as User,
    );

    expect(assignments.findOne).toHaveBeenCalledWith({
      where: { id: assignment.id, courseName: assignment.courseName, groupName: assignment.groupName },
    });
    const submissionWhere = submissions.find.mock.calls[0][0].where;
    expect(submissionWhere.studentId).toEqual(In(enrolledIds));
    expect(result.studentRows).toHaveLength(2);
    expect(result.studentRows[0].submitted).toBe(true);
    expect(result.studentRows[1].submitted).toBe(false);
  });

  it('prevents staff from changing grades on work they do not own', async () => {
    const submissions = {
      findOne: jest.fn().mockResolvedValue({ id: 'submission-1', assignmentId: 'assignment-1', studentId: 'student-1' }),
      update: jest.fn(),
    };
    const assignments = {
      findOne: jest.fn().mockResolvedValue({ id: 'assignment-1', teacherId: 'teacher-1' }),
    };
    const service = createService({ assignments, submissions });

    await expect(service.gradeSubmission(
      'submission-1',
      90,
      undefined,
      { id: 'staff-1', role: UserRole.TEAM_MEMBER, subjects: ['Physics'] } as User,
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(submissions.update).not.toHaveBeenCalled();
  });
});
