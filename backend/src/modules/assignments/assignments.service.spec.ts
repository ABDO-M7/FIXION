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
    groups?: Record<string, jest.Mock>;
    videos?: Record<string, jest.Mock>;
  }) {
    return new AssignmentsService(
      repositories.assignments as unknown as Repository<Assignment>,
      repositories.submissions as unknown as Repository<AssignmentSubmission>,
      {} as never,
      (repositories.enrollments || {}) as unknown as Repository<CourseEnrollment>,
      (repositories.users || {}) as unknown as Repository<User>,
      {} as never,
      {} as never,
      (repositories.groups || {}) as never,
      (repositories.videos || {}) as never,
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

  it('returns groups linked to the selected teacher through groups, enrollments, assignments, or videos', async () => {
    const groups = {
      find: jest.fn().mockResolvedValue([{ groupName: 'Group A', teacherId: 'teacher-1' }]),
    };
    const enrollments = {
      find: jest.fn().mockResolvedValue([
        { groupName: 'Group B', teacherName: 'Teacher One' },
        { groupName: 'Other Teacher Group', teacherName: 'Teacher Two' },
        { groupName: null },
      ]),
    };
    const assignments = {
      find: jest.fn().mockResolvedValue([{ groupName: 'Group C' }]),
    };
    const videos = {
      find: jest.fn().mockResolvedValue([{ groupName: 'Group D', teacher: { name: 'Teacher One' } }]),
    };
    const users = { findOne: jest.fn().mockResolvedValue({ id: 'teacher-1', name: 'Teacher One', role: UserRole.TEACHER }) };
    const service = createService({ assignments, submissions: {}, groups, enrollments, users, videos });

    await expect(service.getAdminTeacherGroups('Physics', 'teacher-1'))
      .resolves.toEqual(['Group A', 'Group B', 'Group C', 'Group D']);
    expect(videos.find).toHaveBeenCalledWith({
      where: [
        { courseName: 'Physics', teacherId: 'teacher-1' },
        { courseName: 'Physics', teacher: { name: 'Teacher One' } },
      ],
      relations: ['teacher'],
    });
  });

  it('builds the outline from all content in the selected group despite differing owner IDs', async () => {
    const assignments = {
      find: jest.fn().mockResolvedValue([
        {
          teacherId: 'legacy-teacher-id',
          teacher: { name: 'Another Teacher' },
          chapterName: 'Chapter 1',
          lessonName: 'Lesson B',
        },
        {
          teacherId: 'assistant-1',
          teacher: { name: 'Another Assistant' },
          chapterName: 'Chapter 1',
          lessonName: 'Lesson A',
        },
      ]),
    };
    const videos = {
      find: jest.fn().mockResolvedValue([
        { teacherId: 'legacy-teacher-id', chapterName: 'Chapter 1', lessonName: 'Lesson A' },
        { teacherId: 'assistant-1', chapterName: 'Chapter 2', lessonName: null },
        { teacherId: 'assistant-1', chapterName: null, lessonName: 'Unassigned lesson' },
      ]),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({ id: 'teacher-1', name: 'Teacher One', role: UserRole.TEACHER }),
    };
    const service = createService({ assignments, submissions: {}, users, videos });

    await expect(service.getAdminTeacherCourseOutline('Physics', 'Group A', 'teacher-1'))
      .resolves.toEqual([
        { name: 'Chapter 1', lessons: ['Lesson A', 'Lesson B'] },
        { name: 'Chapter 2', lessons: [] },
      ]);
    expect(assignments.find).toHaveBeenCalledWith({
      where: { courseName: 'Physics', groupName: 'Group A' },
    });
    expect(videos.find).toHaveBeenCalledWith({
      where: { courseName: 'Physics', groupName: 'Group A' },
    });
  });

  it('returns complete student analytics for an assistant including watch percent, solved/unsolved assignments, and opened files', async () => {
    const enrollmentQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ groupName: 'Group A', studentId: 'student-1' }]),
    };
    const groupQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ groupName: 'Group A' }]),
    };
    const assignmentQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ groupName: 'Group A' }]),
      getMany: jest.fn().mockResolvedValue([
        { id: 'quiz-1', title: 'Quiz 1', type: 'QUIZ', maxGrade: 20, isPublished: true, chapterName: 'Ch 1', lessonName: 'L1' },
        { id: 'hw-1', title: 'Homework 1', type: 'HOMEWORK', maxGrade: 10, isPublished: true, chapterName: 'Ch 1', lessonName: 'L1' },
      ]),
    };
    const videoQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ groupName: 'Group A' }]),
    };
    const submissionQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'sub-1', assignmentId: 'quiz-1', studentId: 'student-1', grade: 18, submittedAt: new Date('2026-01-10T10:00:00Z') },
      ]),
    };
    const progressQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { videoId: 'vid-1', studentId: 'student-1', opened: true, watchedPercent: 85, watchedSeconds: 510, durationSeconds: 600, openedAttachments: [0], updatedAt: new Date('2026-01-10T11:00:00Z') },
        { videoId: 'doc-1', studentId: 'student-1', opened: true, watchedPercent: 0, watchedSeconds: 0, durationSeconds: 0, openedAttachments: [], updatedAt: new Date('2026-01-10T11:05:00Z') },
      ]),
    };

    const service = new AssignmentsService(
      { createQueryBuilder: jest.fn().mockReturnValue(assignmentQuery) } as any,
      { createQueryBuilder: jest.fn().mockReturnValue(submissionQuery) } as any,
      {} as any,
      { createQueryBuilder: jest.fn().mockReturnValue(enrollmentQuery) } as any,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'teacher-1', name: 'Teacher One', role: UserRole.TEACHER, subjects: ['Physics'] }),
        findByIds: jest.fn().mockResolvedValue([{ id: 'student-1', name: 'Ali', email: 'ali@example.com', studentId: 'S100' }]),
      } as any,
      { createQueryBuilder: jest.fn().mockReturnValue(progressQuery) } as any,
      {} as any,
      { createQueryBuilder: jest.fn().mockReturnValue(groupQuery), find: jest.fn().mockResolvedValue([{ groupName: 'Group A', teacherId: 'teacher-1' }]) } as any,
      {
        createQueryBuilder: jest.fn().mockReturnValue(videoQuery),
        find: jest.fn().mockResolvedValue([
          { id: 'vid-1', title: 'Lecture 1', provider: 'bunny', attachments: ['https://example.com/notes.pdf'], chapterName: 'Ch 1', lessonName: 'L1' },
          { id: 'doc-1', title: 'Summary PDF', provider: 'document', attachments: ['https://example.com/summary.pdf'], chapterName: 'Ch 1', lessonName: 'L1' },
        ]),
      } as any,
      { bumpVersion: jest.fn() } as any,
      { find: jest.fn().mockResolvedValue([{ id: 'cp-1', videoId: 'vid-1' }]) } as any,
      { find: jest.fn().mockResolvedValue([{ id: 'vr-1', videoId: 'vid-1', studentId: 'student-1', isCorrect: true, submittedAt: new Date('2026-01-10T11:02:00Z') }]) } as any,
    );

    const analytics = await service.getGroupAnalytics('Physics', 'Group A', {
      id: 'assistant-1',
      role: UserRole.ASSISTANT,
      assignedTeacherId: 'teacher-1',
    } as User);

    expect(analytics.summary.studentCount).toBe(1);
    expect(analytics.summary.averageVideoWatchPercent).toBe(85);
    const student = analytics.students[0];
    expect(student.submittedAssignments).toBe(1);
    expect(student.unsubmittedAssignments).toBe(1);
    expect(student.assignmentDetails['quiz-1'].submitted).toBe(true);
    expect(student.assignmentDetails['quiz-1'].grade).toBe(18);
    expect(student.assignmentDetails['hw-1'].submitted).toBe(false);
    expect(student.videoDetails['vid-1']).toMatchObject({
      opened: true,
      watchedPercent: 85,
      watchedSeconds: 510,
      durationSeconds: 600,
      solvedCheckpoints: 1,
      totalCheckpoints: 1,
    });
    expect(student.documentOpens['vid-1:attachment:0']).toBe(true);
    expect(student.documentOpens['doc-1:attachment:0']).toBe(true);
  });

  it('returns student mistakes from quizzes and video checkpoints with correct answers', async () => {
    const submissionsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'sub-quiz-1',
          assignmentId: 'quiz-1',
          studentId: 'student-1',
          content: JSON.stringify({
            'q-right': 'A',
            'q-wrong': 'B',
            __proctoring: { totalViolations: 2, tabSwitches: 2 },
          }),
          submittedAt: new Date('2026-04-20T12:00:00.000Z'),
        },
      ]),
    };
    const enrollmentsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'enr-1',
          studentId: 'student-1',
          courseName: 'Physics',
          groupName: 'Group A',
        },
      ]),
    };
    const assignmentsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'quiz-1',
          title: 'Quiz 1: Mechanics',
          type: 'QUIZ',
          courseName: 'Physics',
          groupName: 'Group A',
          chapterName: 'Chapter 1',
          lessonName: 'Lesson 1',
        },
      ]),
    };
    const questionsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'q-right',
          assignmentId: 'quiz-1',
          orderIndex: 0,
          questionText: '2 + 2 = ?',
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'A', text: '4' },
            { id: 'B', text: '5' },
          ],
          correctAnswer: 'A',
          points: 2,
        },
        {
          id: 'q-wrong',
          assignmentId: 'quiz-1',
          orderIndex: 1,
          questionText: 'Unit of force is?',
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'A', text: 'Newton' },
            { id: 'B', text: 'Joule' },
          ],
          correctAnswer: 'A',
          points: 3,
        },
      ]),
    };
    const videoResponsesRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'vr-1',
          checkpointId: 'cp-1',
          videoId: 'vid-1',
          studentId: 'student-1',
          answerText: 'B',
          isCorrect: false,
          attempts: 1,
          submittedAt: new Date('2026-04-20T13:00:00.000Z'),
        },
      ]),
    };
    const checkpointsRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'cp-1',
          videoId: 'vid-1',
          prompt: 'What is acceleration?',
          type: 'MCQ',
          options: [
            { id: 'A', text: 'Rate of change of velocity' },
            { id: 'B', text: 'Force times distance' },
          ],
          correctAnswer: 'A',
          solutionText: 'a = dv/dt',
        },
      ]),
    };
    const videosRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'vid-1',
          title: 'Lecture 1',
          courseName: 'Physics',
          groupName: 'Group A',
        },
      ]),
    };

    const service = new AssignmentsService(
      assignmentsRepo as any,
      submissionsRepo as any,
      questionsRepo as any,
      enrollmentsRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      videosRepo as any,
      { bumpVersion: jest.fn() } as any,
      checkpointsRepo as any,
      videoResponsesRepo as any,
    );

    const mistakes = await service.getStudentMistakes('student-1');

    expect(mistakes).toHaveLength(2);
    const quizMistake = mistakes.find(m => m.sourceType === 'QUIZ');
    const cpMistake = mistakes.find(m => m.sourceType === 'VIDEO_CHECKPOINT');

    expect(quizMistake).toMatchObject({
      sourceId: 'quiz-1',
      questionId: 'q-wrong',
      studentAnswer: 'B',
      studentAnswerText: 'Joule',
      correctAnswer: 'A',
      correctAnswerText: 'Newton',
      enrollmentId: 'enr-1',
    });
    expect(cpMistake).toMatchObject({
      sourceId: 'vid-1',
      questionId: 'cp-1',
      studentAnswer: 'B',
      studentAnswerText: 'Force times distance',
      correctAnswer: 'A',
      correctAnswerText: 'Rate of change of velocity',
      explanation: 'a = dv/dt',
    });
  });
});
