import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment, AssignmentType } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { QuizQuestion, QuizQuestionType, QuizOption } from './entities/quiz-question.entity';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { canManageOwnedWork, resolveStaffScope, workOwnerId, StaffScope, hasPermission } from '../../common/staff-access';
import { UnlockRuleType } from '../learning/unlock-rule';
import { VideoProgress } from '../videos/entities/video-progress.entity';

import { Course } from './entities/course.entity';
import { CourseGroup } from './entities/course-group.entity';
import { CourseVideo } from '../videos/entities/course-video.entity';
import { SubscriptionCode } from '../subscriptions/entities/subscription-code.entity';
import { Question } from '../questions/entities/question.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentsRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private submissionsRepo: Repository<AssignmentSubmission>,
    @InjectRepository(QuizQuestion)
    private questionsRepo: Repository<QuizQuestion>,
    @InjectRepository(CourseEnrollment)
    private enrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(VideoProgress)
    private videoProgressRepo: Repository<VideoProgress>,
    @InjectRepository(Course)
    private coursesRepo: Repository<Course>,
    @InjectRepository(CourseGroup)
    private courseGroupsRepo: Repository<CourseGroup>,
    @InjectRepository(CourseVideo)
    private videosRepo: Repository<CourseVideo>,
  ) {}

  private async staffScope(user: User) {
    return resolveStaffScope(this.usersRepo, user);
  }

  private async assertCanManageGroup(courseName: string, groupName: string, actor: User) {
    const scope = await this.staffScope(actor);
    if (scope.type === 'admin') return scope;
    if (scope.type === 'subjects') {
      if (!scope.subjects.includes(courseName)) {
        throw new ForbiddenException('This course is not in your subject');
      }
      return scope;
    }

    const groups = await this.getGroupsForCourse(courseName, actor);
    if (!groups.includes(groupName)) throw new ForbiddenException('You do not have access to this group');
    return scope;
  }

  private async assertCanManageAssignment(assignmentId: string, actor: User) {
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    const scope = await this.staffScope(actor);
    if (!canManageOwnedWork(scope, actor, assignment.teacherId)) throw new ForbiddenException();
    return assignment;
  }

  private applyEnrollmentScope(qb: ReturnType<Repository<CourseEnrollment>['createQueryBuilder']>, scope: StaffScope) {
    if (scope.type === 'teacher') {
      if (!scope.teacherName) {
        qb.andWhere('1=0');
        return qb;
      }
      qb.andWhere('(e.teacherId = :teacherId OR (e.teacherId IS NULL AND e.teacherName = :teacherName))', {
        teacherId: scope.teacherId,
        teacherName: scope.teacherName,
      });
    } else if (scope.type === 'subjects' && scope.subjects.length > 0) {
      qb.andWhere('e.courseName IN (:...subjects)', { subjects: scope.subjects });
    } else if (scope.type === 'subjects') {
      qb.andWhere('1=0');
    }
    return qb;
  }

  // ─── ADMIN: create course ────────────────────────────────────────────────
  async createCourse(dto: { name: string; color?: string; description?: string }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Course name is required');
    let course = await this.coursesRepo.findOne({ where: { name } });
    if (!course) {
      course = this.coursesRepo.create({
        name,
        color: dto.color || null,
        description: dto.description || null,
      });
      await this.coursesRepo.save(course);
    }
    const defaultGroup = await this.courseGroupsRepo.findOne({
      where: { courseName: name, groupName: 'Group 1' },
    });
    if (!defaultGroup) {
      await this.courseGroupsRepo.save(
        this.courseGroupsRepo.create({
          courseName: name,
          groupName: 'Group 1',
        }),
      );
    }
    return course;
  }

  // ─── ADMIN: delete course ────────────────────────────────────────────────
  async deleteCourse(courseName: string) {
    await this.coursesRepo.delete({ name: courseName });
    await this.courseGroupsRepo.delete({ courseName });
    return { success: true };
  }

  // ─── ADMIN: update course ────────────────────────────────────────────────
  async updateCourse(currentName: string, dto: { name?: string; color?: string; description?: string }) {
    const rawNewName = dto.name !== undefined ? dto.name.trim() : currentName;
    if (!rawNewName) throw new BadRequestException('Course name cannot be empty');

    const nameChanged = rawNewName !== currentName;

    if (nameChanged) {
      const existingNew = await this.coursesRepo.findOne({ where: { name: rawNewName } });
      if (existingNew) {
        throw new BadRequestException(`Course with name "${rawNewName}" already exists`);
      }
    }

    let course = await this.coursesRepo.findOne({ where: { name: currentName } });
    if (!course) {
      course = this.coursesRepo.create({
        name: rawNewName,
        color: dto.color !== undefined ? dto.color : null,
        description: dto.description !== undefined ? dto.description : null,
      });
      await this.coursesRepo.save(course);
    } else {
      if (nameChanged) course.name = rawNewName;
      if (dto.color !== undefined) course.color = dto.color || null;
      if (dto.description !== undefined) course.description = dto.description || null;
      await this.coursesRepo.save(course);
    }

    if (nameChanged) {
      // 1. Update CourseGroup
      await this.courseGroupsRepo.update({ courseName: currentName }, { courseName: rawNewName });

      // 2. Update Assignment
      await this.assignmentsRepo.update({ courseName: currentName }, { courseName: rawNewName });

      // 3. Update CourseVideo
      await this.videosRepo.update({ courseName: currentName }, { courseName: rawNewName });

      // 4. Update CourseEnrollment
      await this.enrollmentsRepo.update({ courseName: currentName }, { courseName: rawNewName });

      // 5. Update SubscriptionCode
      await this.coursesRepo.manager.getRepository(SubscriptionCode).update(
        { courseName: currentName },
        { courseName: rawNewName },
      );

      // 6. Update Question
      await this.coursesRepo.manager.getRepository(Question).update(
        { courseName: currentName },
        { courseName: rawNewName },
      );

      // 7. Update Users subjects array
      const allUsers = await this.usersRepo.find();
      for (const u of allUsers) {
        if (Array.isArray(u.subjects) && u.subjects.includes(currentName)) {
          const updatedSubjects = u.subjects.map(s => s === currentName ? rawNewName : s);
          await this.usersRepo.update(u.id, { subjects: updatedSubjects });
        }
      }
    }

    return course;
  }

  // ─── ADMIN/STAFF: create/update course group ─────────────────────────────
  async createCourseGroup(courseName: string, dto: { groupName: string; teacherId?: string; schedule?: string }) {
    const groupName = dto.groupName?.trim();
    if (!groupName) throw new BadRequestException('Group name is required');

    let course = await this.coursesRepo.findOne({ where: { name: courseName } });
    if (!course) {
      course = this.coursesRepo.create({ name: courseName });
      await this.coursesRepo.save(course);
    }

    let teacher: User | null = null;
    if (dto.teacherId) {
      teacher = await this.usersRepo.findOne({ where: { id: dto.teacherId } });
    }

    let group = await this.courseGroupsRepo.findOne({
      where: { courseName, groupName },
    });
    if (!group) {
      group = this.courseGroupsRepo.create({
        courseName,
        groupName,
        teacherId: teacher?.id || null,
        teacherName: teacher?.name || null,
        schedule: dto.schedule || null,
      });
    } else {
      if (dto.teacherId !== undefined) {
        group.teacherId = teacher?.id || null;
        group.teacherName = teacher?.name || null;
      }
      if (dto.schedule !== undefined) {
        group.schedule = dto.schedule || null;
      }
    }
    return this.courseGroupsRepo.save(group);
  }

  // ─── ADMIN: delete course group ──────────────────────────────────────────
  async deleteCourseGroup(courseName: string, groupName: string) {
    // 1. Delete quiz submissions tied to assignments in this group
    const groupAssignments = await this.assignmentsRepo.find({
      where: { courseName, groupName },
      select: ['id'],
    });
    if (groupAssignments.length > 0) {
      const assignmentIds = groupAssignments.map((a) => a.id);
      await this.submissionsRepo
        .createQueryBuilder()
        .delete()
        .where('assignmentId IN (:...ids)', { ids: assignmentIds })
        .execute();
    }

    // 2. Delete assignments for this group
    await this.assignmentsRepo.delete({ courseName, groupName });

    // 3. Delete video progress records for videos in this group
    const groupVideos = await this.videosRepo.find({
      where: { courseName, groupName },
      select: ['id'],
    });
    if (groupVideos.length > 0) {
      const videoIds = groupVideos.map((v) => v.id);
      await this.videoProgressRepo
        .createQueryBuilder()
        .delete()
        .where('videoId IN (:...ids)', { ids: videoIds })
        .execute();
    }

    // 4. Delete videos for this group
    await this.videosRepo.delete({ courseName, groupName });

    // 5. Delete enrollments for this group
    await this.enrollmentsRepo.delete({ courseName, groupName });

    // 6. Delete the group record itself
    await this.courseGroupsRepo.delete({ courseName, groupName });

    return { success: true };
  }

  // ─── STAFF: get courses they are allowed to see ───────────────────────────
  async getTeacherCourses(teacher: User): Promise<string[]> {
    const scope = await this.staffScope(teacher);
    if (scope.type === 'subjects') return scope.subjects || [];

    const defaultCourses = ['فيزيا', 'رياضه', 'احصاء', 'عربي', 'برمجه'];
    const coursesRows = await this.coursesRepo.find();
    const registeredCourses = coursesRows.map((c) => c.name).filter(Boolean);

    const qb = this.enrollmentsRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.courseName', 'courseName');
    this.applyEnrollmentScope(qb, scope);
    const rows = await qb.getRawMany();
    const enrolledCourses = rows.map((r) => r.courseName).filter(Boolean);

    if (scope.type === 'admin') {
      const assignmentCourses = await this.assignmentsRepo
        .createQueryBuilder('a')
        .select('DISTINCT a.courseName', 'courseName')
        .getRawMany();
      const videoCourses = await this.videosRepo
        .createQueryBuilder('v')
        .select('DISTINCT v.courseName', 'courseName')
        .getRawMany();
      const groupCourses = await this.courseGroupsRepo
        .createQueryBuilder('cg')
        .select('DISTINCT cg.courseName', 'courseName')
        .getRawMany();

      const set = new Set<string>([
        ...defaultCourses,
        ...registeredCourses,
        ...enrolledCourses,
        ...assignmentCourses.map((r) => r.courseName).filter(Boolean),
        ...videoCourses.map((r) => r.courseName).filter(Boolean),
        ...groupCourses.map((r) => r.courseName).filter(Boolean),
      ]);
      return Array.from(set);
    }

    if (scope.type === 'teacher') {
      // Use the resolved teacherId from scope — this works correctly for both
      // a TEACHER (scope.teacherId = teacher.id) and an ASSISTANT
      // (scope.teacherId = assignedTeacher.id).
      const effectiveTeacherId = scope.teacherId;
      if (!effectiveTeacherId) return [];

      const teacherUser = await this.usersRepo.findOne({ where: { id: effectiveTeacherId } });
      const teacherSubjects = Array.isArray(teacherUser?.subjects) ? teacherUser.subjects : [];

      const assignmentCourses = await this.assignmentsRepo
        .createQueryBuilder('a')
        .select('DISTINCT a.courseName', 'courseName')
        .where('a.teacherId = :tid', { tid: effectiveTeacherId })
        .getRawMany();
      const videoCourses = await this.videosRepo
        .createQueryBuilder('v')
        .select('DISTINCT v.courseName', 'courseName')
        .where('v.teacherId = :tid', { tid: effectiveTeacherId })
        .getRawMany();
      const groupCourses = await this.courseGroupsRepo
        .createQueryBuilder('cg')
        .select('DISTINCT cg.courseName', 'courseName')
        .where('cg.teacherId = :tid', { tid: effectiveTeacherId })
        .getRawMany();

      const set = new Set<string>([
        ...enrolledCourses,
        ...teacherSubjects,
        ...assignmentCourses.map((r) => r.courseName).filter(Boolean),
        ...videoCourses.map((r) => r.courseName).filter(Boolean),
        ...groupCourses.map((r) => r.courseName).filter(Boolean),
      ]);
      return Array.from(set);
    }

    return enrolledCourses;
  }

  // ─── STAFF: get distinct groups for a course ──────────────────────────────
  async getGroupsForCourse(courseName: string, actor: User): Promise<string[]> {
    const scope = await this.staffScope(actor);

    // team_member: only allowed subjects
    if (scope.type === 'subjects') {
      if (scope.subjects.length > 0 && !scope.subjects.includes(courseName)) return [];
    }

    // teacher / assistant: only groups that belong to this teacher
    if (scope.type === 'teacher') {
      const effectiveTeacherId = scope.teacherId;
      if (!effectiveTeacherId) return [];

      const savedGroupsQb = this.courseGroupsRepo
        .createQueryBuilder('cg')
        .select('DISTINCT cg.groupName', 'groupName')
        .where('cg.courseName = :courseName', { courseName })
        .andWhere('cg.teacherId = :tid', { tid: effectiveTeacherId });
      const savedGroups = await savedGroupsQb.getRawMany();

      const enrollQb = this.enrollmentsRepo
        .createQueryBuilder('e')
        .select('DISTINCT e.groupName', 'groupName')
        .where('e.courseName = :courseName', { courseName })
        .andWhere('e.groupName IS NOT NULL');
      this.applyEnrollmentScope(enrollQb, scope);
      const enrolledGroups = (await enrollQb.getRawMany()).map((r) => r.groupName).filter(Boolean);

      const assignmentGroups = await this.assignmentsRepo
        .createQueryBuilder('a')
        .select('DISTINCT a.groupName', 'groupName')
        .where('a.courseName = :courseName', { courseName })
        .andWhere('a.teacherId = :tid', { tid: effectiveTeacherId })
        .getRawMany();

      const videoGroups = await this.videosRepo
        .createQueryBuilder('v')
        .select('DISTINCT v.groupName', 'groupName')
        .where('v.courseName = :courseName', { courseName })
        .andWhere('v.teacherId = :tid', { tid: effectiveTeacherId })
        .getRawMany();

      const set = new Set<string>([
        ...savedGroups.map((r) => r.groupName).filter(Boolean),
        ...enrolledGroups,
        ...assignmentGroups.map((r) => r.groupName).filter(Boolean),
        ...videoGroups.map((r) => r.groupName).filter(Boolean),
      ]);
      return Array.from(set);
    }

    // admin: all groups for course
    const savedGroups = await this.courseGroupsRepo
      .createQueryBuilder('cg')
      .select('DISTINCT cg.groupName', 'groupName')
      .where('cg.courseName = :courseName', { courseName })
      .getRawMany();

    const qb = this.enrollmentsRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.groupName', 'groupName')
      .where('e.courseName = :courseName', { courseName })
      .andWhere('e.groupName IS NOT NULL');
    const rows = await qb.getRawMany();
    const enrolledGroups = rows.map((r) => r.groupName).filter(Boolean);

    const assignmentGroups = await this.assignmentsRepo
      .createQueryBuilder('a')
      .select('DISTINCT a.groupName', 'groupName')
      .where('a.courseName = :courseName', { courseName })
      .getRawMany();

    const videoGroups = await this.videosRepo
      .createQueryBuilder('v')
      .select('DISTINCT v.groupName', 'groupName')
      .where('v.courseName = :courseName', { courseName })
      .getRawMany();

    const set = new Set<string>([
      ...savedGroups.map((r) => r.groupName).filter(Boolean),
      ...enrolledGroups,
      ...assignmentGroups.map((r) => r.groupName).filter(Boolean),
      ...videoGroups.map((r) => r.groupName).filter(Boolean),
    ]);
    if (set.size === 0) set.add('Group 1');
    return Array.from(set);
  }

  // ─── STAFF: get rich groups info including assigned teacher and student count ─
  async getGroupsDetailedForCourse(courseName: string, actor: User) {
    const groupNames = await this.getGroupsForCourse(courseName, actor);

    // Find all active teachers who teach this course
    const allTeachers = await this.usersRepo.find({ where: { role: UserRole.TEACHER, isActive: true } });
    const courseTeachers = allTeachers.filter(t => Array.isArray(t.subjects) && t.subjects.includes(courseName));
    const defaultTeacher = courseTeachers[0] || null;

    // Load explicit group records from course_groups
    const savedGroups = await this.courseGroupsRepo.find({
      where: { courseName },
      relations: ['teacher'],
    });
    const savedGroupMap = new Map(savedGroups.map((g) => [g.groupName, g]));

    const details = await Promise.all(
      groupNames.map(async (groupName) => {
        const studentCount = await this.enrollmentsRepo.count({
          where: { courseName, groupName },
        });

        const explicitGroup = savedGroupMap.get(groupName);

        const enrollmentWithTeacher = await this.enrollmentsRepo.findOne({
          where: { courseName, groupName },
          relations: ['teacher'],
          order: { createdAt: 'DESC' },
        });

        const assignmentWithTeacher = await this.assignmentsRepo.findOne({
          where: { courseName, groupName },
          relations: ['teacher'],
          order: { createdAt: 'DESC' },
        });

        const teacher =
          explicitGroup?.teacher ||
          enrollmentWithTeacher?.teacher ||
          assignmentWithTeacher?.teacher ||
          defaultTeacher;

        const teacherName =
          explicitGroup?.teacher?.name ||
          explicitGroup?.teacherName ||
          teacher?.name ||
          enrollmentWithTeacher?.teacherName ||
          defaultTeacher?.name ||
          'مدرس المادة';

        return {
          groupName,
          courseName,
          teacherName,
          teacherId: teacher?.id || explicitGroup?.teacherId || null,
          studentCount,
          schedule: explicitGroup?.schedule || null,
        };
      }),
    );

    return details;
  }


  // ─── TEACHER: get students enrolled in a specific group ───────────────────
  async getStudentsInGroup(courseName: string, groupName: string) {
    // Step 1: get all enrollment rows (just the studentId column, no join needed)
    const enrollments = await this.enrollmentsRepo.find({
      where: { courseName, groupName },
      select: ['studentId'],
    });
    const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId).filter(Boolean)));
    if (studentIds.length === 0) return [];

    // Step 2: directly fetch user rows by primary key — 100% reliable
    const users = await this.usersRepo.findByIds(studentIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return studentIds.map((sid) => {
      const u = userMap.get(sid);
      return {
        id: sid,
        name: u?.name ?? null,
        email: u?.email ?? null,
        studentId: u?.studentId ?? null,
        phone: u?.phone ?? null,
        parentPhone: u?.parentPhone ?? null,
        level: u?.level ?? null,
      };
    });
  }

  // ─── TEACHER: create assignment ────────────────────────────────────────────
  async createAssignment(dto: {
    courseName: string;
    groupName: string;
    type: AssignmentType;
    title: string;
    description?: string;
    attachments?: string[];
    dueDate?: string;
    maxGrade?: number;
    chapterName?: string;
    lessonName?: string;
    contentOrder?: number;
    unlockRule?: UnlockRuleType;
    unlockAssignmentId?: string;
    unlockScore?: number;
    unlockVideoId?: string;
    unlockPercent?: number;
    isPublished?: boolean;
  }, teacher: User): Promise<Assignment> {
    if (![AssignmentType.QUIZ, AssignmentType.HOMEWORK].includes(dto.type)) {
      throw new BadRequestException('Only quizzes and homework can be created here');
    }
    const courseName = dto.courseName?.trim();
    const groupName = dto.groupName?.trim();
    const chapterName = dto.chapterName?.trim();
    const lessonName = dto.lessonName?.trim();
    if (!courseName || !groupName) throw new BadRequestException('Course and group are required');
    if (!chapterName || !lessonName) throw new BadRequestException('Choose a chapter and lesson for this assignment');
    const scope = await this.assertCanManageGroup(courseName, groupName, teacher);
    const assignment = this.assignmentsRepo.create({
      ...dto,
      courseName,
      groupName,
      isPublished: scope.type === 'admin' && dto.isPublished !== undefined
        ? Boolean(dto.isPublished)
        : dto.type === AssignmentType.QUIZ
          ? false
          : true,
      maxGrade: dto.maxGrade ?? 100,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      chapterName,
      lessonName,
      contentOrder: Number.isFinite(Number(dto.contentOrder)) ? Number(dto.contentOrder) : 0,
      unlockRule: dto.unlockRule || UnlockRuleType.NONE,
      unlockAssignmentId: dto.unlockAssignmentId || null,
      unlockScore: dto.unlockScore ?? null,
      unlockVideoId: dto.unlockVideoId || null,
      unlockPercent: dto.unlockPercent ?? null,
      teacherId: workOwnerId(scope, teacher),
    });
    return this.assignmentsRepo.save(assignment);
  }

  // ─── GET assignments for a group ──────────────────────────────────────────
  async getAssignments(courseName: string, groupName: string, type?: AssignmentType, actor?: User) {
    if (actor && actor.role !== UserRole.ADMIN) {
      const scope = await this.staffScope(actor);
      if (scope.type === 'subjects' && !scope.subjects.includes(courseName)) return [];
      if (scope.type === 'teacher') {
        const groups = await this.getGroupsForCourse(courseName, actor);
        if (!groups.includes(groupName)) return [];
      }
    }
    const qb = this.assignmentsRepo
      .createQueryBuilder('a')
      .where('a.courseName = :courseName', { courseName })
      .andWhere('a.groupName = :groupName', { groupName })
      .orderBy('a.createdAt', 'DESC');

    if (type) qb.andWhere('a.type = :type', { type });
    const assignments = await qb.getMany();
    if (!actor) return assignments;

    const scope = await this.staffScope(actor);
    return assignments.map(assignment => ({
      ...assignment,
      canManage: canManageOwnedWork(scope, actor, assignment.teacherId),
    }));
  }

  // ─── GET single assignment with submissions ────────────────────────────────
  async getAssignmentWithSubmissions(assignmentId: string, courseName: string, groupName: string) {
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const students = await this.getStudentsInGroup(courseName, groupName);
    const submissions = await this.submissionsRepo.find({
      where: { assignmentId },
      relations: ['student'],
    });

    const submissionMap = new Map(submissions.map((s) => [s.studentId, s]));

    const studentRows = students.map((student) => {
      const submission = submissionMap.get(student.id);
      // Merge studentId from submission.student if the enrollment row is missing it
      const mergedStudent = {
        ...student,
        studentId: student.studentId ?? submission?.student?.studentId ?? null,
        name: student.name ?? submission?.student?.name,
        email: student.email ?? submission?.student?.email,
      };
      return {
        student: mergedStudent,
        submitted: !!submission,
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              attachments: submission.attachments,
              grade: submission.grade ?? null,
              feedback: submission.feedback ?? null,
              submittedAt: submission.submittedAt,
            }
          : null,
      };
    });

    return { assignment, studentRows };
  }

  // ─── STUDENT: submit assignment (homework) ────────────────────────────────
  async submitAssignment(
    assignmentId: string,
    student: User,
    dto: { content?: string; attachments?: string[] },
  ) {
    if (!hasPermission(student, 'student_assignments')) throw new ForbiddenException('Assignments are disabled for this account');
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!assignment.isPublished) throw new ForbiddenException('This assignment is not published');
    await this.assertAssignmentUnlocked(assignmentId, student.id);

    const existing = await this.submissionsRepo.findOne({
      where: { assignmentId, studentId: student.id },
    });
    if (existing) {
      await this.submissionsRepo.update(existing.id, dto);
      return this.submissionsRepo.findOne({ where: { id: existing.id } });
    }

    return this.submissionsRepo.save(
      this.submissionsRepo.create({ assignmentId, studentId: student.id, ...dto }),
    );
  }

  // ─── STUDENT: submit quiz (with auto-grading) ────────────────────────────
  async submitQuiz(
    assignmentId: string,
    student: User,
    answers: Record<string, string>, // { questionId: answeredOption }
  ) {
    if (!hasPermission(student, 'student_assignments')) throw new ForbiddenException('Assignments are disabled for this account');
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Quiz not found');
    if (!assignment.isPublished) throw new ForbiddenException('This quiz is not published');
    await this.assertAssignmentUnlocked(assignmentId, student.id);

    const questions = await this.questionsRepo.find({
      where: { assignmentId },
      order: { orderIndex: 'ASC' },
    });

    // Auto-grade
    let earnedPoints = 0;
    let totalPoints = 0;
    let hasTextQuestion = false;

    for (const q of questions) {
      if (q.type === 'TEXT') {
        hasTextQuestion = true;
      }
      totalPoints += q.points;
      if (q.correctAnswer && answers[q.id] !== undefined) {
        const studentAns = answers[q.id].trim().toLowerCase();
        const correct = q.correctAnswer.trim().toLowerCase();
        if (studentAns === correct) earnedPoints += q.points;
      }
    }

    // Convert to grade out of maxGrade
    let grade: number | null = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * assignment.maxGrade)
      : 0;

    // If there's a text question, the grade remains pending (null) until teacher manually grades it
    if (hasTextQuestion) {
      grade = null;
    }

    const content = JSON.stringify(answers); // store answers as JSON string

    const existing = await this.submissionsRepo.findOne({
      where: { assignmentId, studentId: student.id },
    });

    if (existing) {
      throw new ConflictException('You have already submitted this quiz.');
    }

    const saved = await this.submissionsRepo.save(
      this.submissionsRepo.create({ assignmentId, studentId: student.id, content, grade }),
    );

    return {
      ...saved,
      maxGrade: assignment.maxGrade,
    };
  }

  // ─── TEACHER: grade a submission ──────────────────────────────────────────
  async gradeSubmission(submissionId: string, grade: number, feedback?: string) {
    const submission = await this.submissionsRepo.findOne({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.submissionsRepo.update(submissionId, { grade, feedback });
    return this.submissionsRepo.findOne({ where: { id: submissionId } });
  }

  // ─── TEACHER: get grade matrix for a group ────────────────────────────────
  async getGradeMatrix(courseName: string, groupName: string) {
    const students = await this.getStudentsInGroup(courseName, groupName);
    const assignments = await this.getAssignments(courseName, groupName);

    const submissions = await this.submissionsRepo
      .createQueryBuilder('s')
      .where('s.assignmentId IN (:...ids)', {
        ids: assignments.length > 0 ? assignments.map((a) => a.id) : ['00000000-0000-0000-0000-000000000000'],
      })
      .getMany();

    const gradeMap = new Map<string, Map<string, number | null>>();
    for (const student of students) {
      gradeMap.set(student.id, new Map());
    }
    for (const sub of submissions) {
      gradeMap.get(sub.studentId)?.set(sub.assignmentId, sub.grade ?? null);
    }

    return {
      students,
      assignments,
      gradeMap: Object.fromEntries(
        [...gradeMap.entries()].map(([sid, aMap]) => [
          sid,
          Object.fromEntries(aMap.entries()),
        ]),
      ),
    };
  }

  async getGroupAnalytics(courseName: string, groupName: string, actor: User) {
    const scope = await this.staffScope(actor);
    if (scope.type === 'subjects' && !scope.subjects.includes(courseName)) {
      throw new ForbiddenException('This course is not in your subject');
    }
    if (scope.type === 'teacher') {
      const groups = await this.getGroupsForCourse(courseName, actor);
      if (!groups.includes(groupName)) throw new ForbiddenException('You do not have access to this group');
    }

    const [students, allAssignments, videos] = await Promise.all([
      this.getStudentsInGroup(courseName, groupName),
      this.getAssignments(courseName, groupName),
      this.videosRepo.find({ where: { courseName, groupName } }),
    ]);
    const assignments = allAssignments.filter(assignment => assignment.isPublished);
    const studentIds = students.map(student => student.id);
    const assignmentIds = assignments.map(assignment => assignment.id);
    const lessonVideos = videos.filter(video => video.provider !== 'document' && video.provider !== 'pdf');
    const documents = videos.flatMap<{ id: string; title: string; videoId: string; attachmentIndex: number | null }>(video => {
      const isDocument = video.provider === 'document' || video.provider === 'pdf';
      if (Array.isArray(video.attachments) && video.attachments.length > 0) {
        return video.attachments.map((_attachment, attachmentIndex) => ({
          id: `${video.id}:attachment:${attachmentIndex}`,
          title: `${video.title} - ملف ${attachmentIndex + 1}`,
          videoId: video.id,
          attachmentIndex,
        }));
      }
      return isDocument
        ? [{ id: video.id, title: video.title, videoId: video.id, attachmentIndex: null }]
        : [];
    });
    const videoIds = videos.map(video => video.id);

    const [submissions, progress] = await Promise.all([
      assignmentIds.length && studentIds.length
        ? this.submissionsRepo.createQueryBuilder('submission')
          .where('submission.assignmentId IN (:...assignmentIds)', { assignmentIds })
          .andWhere('submission.studentId IN (:...studentIds)', { studentIds })
          .getMany()
        : Promise.resolve([]),
      videoIds.length && studentIds.length
        ? this.videoProgressRepo.createQueryBuilder('progress')
          .where('progress.videoId IN (:...videoIds)', { videoIds })
          .andWhere('progress.studentId IN (:...studentIds)', { studentIds })
          .getMany()
        : Promise.resolve([]),
    ]);

    const submissionsByStudent = new Map<string, AssignmentSubmission[]>();
    submissions.forEach(submission => {
      const rows = submissionsByStudent.get(submission.studentId) || [];
      rows.push(submission);
      submissionsByStudent.set(submission.studentId, rows);
    });
    const progressByStudent = new Map<string, VideoProgress[]>();
    progress.forEach(row => {
      const rows = progressByStudent.get(row.studentId) || [];
      rows.push(row);
      progressByStudent.set(row.studentId, rows);
    });

    const assignmentById = new Map(assignments.map(assignment => [assignment.id, assignment]));
    const studentsWithStats = students.map(student => {
      const studentSubmissions = submissionsByStudent.get(student.id) || [];
      const studentProgress = progressByStudent.get(student.id) || [];
      const gradedSubmissions = studentSubmissions.filter(submission => submission.grade !== null);
      const gradePercentages = gradedSubmissions.flatMap(submission => {
        const assignment = assignmentById.get(submission.assignmentId);
        return assignment
          ? [Math.min(100, Math.max(0, (submission.grade! / Math.max(assignment.maxGrade, 1)) * 100))]
          : [];
      });
      const averageGradePercent = gradePercentages.length
        ? Math.round(gradePercentages.reduce((sum, value) => sum + value, 0) / gradePercentages.length)
        : null;
      const progressByVideo = new Map(studentProgress.map(row => [row.videoId, row]));
      const completedVideos = lessonVideos.filter(video => (progressByVideo.get(video.id)?.watchedPercent || 0) >= 90).length;
      const videoProgressPercent = lessonVideos.length
        ? Math.round(lessonVideos.reduce((sum, video) => sum + (progressByVideo.get(video.id)?.watchedPercent || 0), 0) / lessonVideos.length)
        : null;
      const activityDates = [
        ...studentSubmissions.map(submission => submission.submittedAt),
        ...studentProgress.map(row => row.updatedAt),
      ].filter(Boolean);

      return {
        ...student,
        submittedAssignments: studentSubmissions.length,
        gradedAssignments: gradedSubmissions.length,
        averageGradePercent,
        completedVideos,
        totalVideos: lessonVideos.length,
        videoProgressPercent,
        documentOpens: Object.fromEntries(documents.map(document => {
          const resourceProgress = progressByVideo.get(document.videoId);
          return [
            document.id,
            document.attachmentIndex === null
              ? resourceProgress?.opened ?? false
              : (resourceProgress?.openedAttachments || []).includes(document.attachmentIndex),
          ];
        })),
        lastActivityAt: activityDates.length
          ? new Date(Math.max(...activityDates.map(date => new Date(date).getTime()))).toISOString()
          : null,
        assignmentGrades: Object.fromEntries(studentSubmissions.map(submission => [
          submission.assignmentId,
          submission.grade,
        ])),
        videoProgress: Object.fromEntries(lessonVideos.map(video => [
          video.id,
          progressByVideo.get(video.id)?.watchedPercent ?? 0,
        ])),
      };
    });

    const average = (values: Array<number | null>) => {
      const available = values.filter((value): value is number => value !== null);
      return available.length
        ? Math.round(available.reduce((sum, value) => sum + value, 0) / available.length)
        : null;
    };
    const possibleSubmissions = students.length * assignments.length;
    const possibleVideoViews = students.length * lessonVideos.length;
    const lessonVideoIds = new Set(lessonVideos.map(video => video.id));
    const lessonProgressRows = progress.filter(row => lessonVideoIds.has(row.videoId));

    return {
      summary: {
        studentCount: students.length,
        assignmentCount: assignments.length,
        videoCount: lessonVideos.length,
        documentCount: documents.length,
        averageGradePercent: average(studentsWithStats.map(student => student.averageGradePercent)),
        assignmentSubmissionRate: possibleSubmissions
          ? Math.round((submissions.length / possibleSubmissions) * 100)
          : null,
        videoCompletionRate: possibleVideoViews
          ? Math.round((lessonProgressRows.filter(row => row.watchedPercent >= 90).length / possibleVideoViews) * 100)
          : null,
      },
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        maxGrade: assignment.maxGrade,
      })),
      videos: lessonVideos.map(video => ({
        id: video.id,
        title: video.title,
        provider: video.provider,
      })),
      documents,
      students: studentsWithStats,
    };
  }

  // ─── STUDENT: get their assignments for a course/group ────────────────────
  async getStudentAssignments(studentId: string, courseName: string, groupName: string) {
    const allAssignments = await this.getAssignments(courseName, groupName);
    const assignments = allAssignments.filter(a => a.isPublished); // Only show published to students

    const submissions = await this.submissionsRepo.find({
      where: { studentId },
    });
    const subMap = new Map(submissions.map((s) => [s.assignmentId, s]));
    return Promise.all(assignments.map(async (a) => {
      const submission = subMap.get(a.id) || null;
      const unlock = await this.getUnlockState(a.unlockRule, a.unlockAssignmentId, a.unlockScore, a.unlockVideoId, a.unlockPercent, studentId, subMap);
      return { ...a, submission, ...unlock };
    }));
  }

  async assertAssignmentUnlocked(assignmentId: string, studentId: string) {
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (studentId && !assignment.isPublished) throw new ForbiddenException('This assignment is not published');
    const submission = assignment.unlockAssignmentId
      ? await this.submissionsRepo.findOne({ where: { assignmentId: assignment.unlockAssignmentId, studentId } })
      : null;
    const unlock = await this.getUnlockState(
      assignment.unlockRule,
      assignment.unlockAssignmentId,
      assignment.unlockScore,
      assignment.unlockVideoId,
      assignment.unlockPercent,
      studentId,
      new Map(assignment.unlockAssignmentId ? [[assignment.unlockAssignmentId, submission as AssignmentSubmission]] : []),
    );
    if (unlock.isLocked) throw new ForbiddenException(unlock.lockReason);
    return assignment;
  }

  private async getUnlockState(
    rule: UnlockRuleType,
    prerequisiteId: string | null,
    requiredScore: number | null,
    prerequisiteVideoId: string | null,
    requiredPercent: number | null,
    studentId: string,
    submissions: Map<string, AssignmentSubmission>,
  ) {
    if (rule === UnlockRuleType.WATCH_VIDEO) {
      if (!prerequisiteVideoId) return { isLocked: false, lockReason: null };
      const progress = await this.videoProgressRepo.findOne({ where: { videoId: prerequisiteVideoId, studentId } });
      const threshold = requiredPercent != null ? requiredPercent : 100;
      if (!progress || progress.watchedPercent < threshold) {
        return { isLocked: true, lockReason: `Watch at least ${threshold}% of the previous video` };
      }
      return { isLocked: false, lockReason: null };
    }
    if (!rule || rule === UnlockRuleType.NONE || !prerequisiteId) return { isLocked: false, lockReason: null };
    const submission = submissions.get(prerequisiteId);
    if (!submission) {
      return { isLocked: true, lockReason: rule === UnlockRuleType.PASS_QUIZ ? 'Complete the previous quiz first' : 'Submit the previous assignment first' };
    }
    const prerequisite = await this.assignmentsRepo.findOne({ where: { id: prerequisiteId } });
    const percentage = submission.grade === null || submission.grade === undefined
      ? 0
      : (submission.grade / Math.max(prerequisite?.maxGrade ?? 100, 1)) * 100;
    if (rule === UnlockRuleType.PASS_QUIZ && (submission.grade === null || submission.grade === undefined || percentage < (requiredScore ?? 50))) {
      return { isLocked: true, lockReason: `You need at least ${requiredScore ?? 50}% in the previous quiz` };
    }
    return { isLocked: false, lockReason: null };
  }

  async getStudentSubmission(assignmentId: string, studentId: string) {
    const submission = await this.submissionsRepo.findOne({ where: { assignmentId, studentId } });
    if (!submission) return null;
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    return { ...submission, maxGrade: assignment?.maxGrade ?? 100 };
  }

  // ─── TEACHER: publish assignment ───────────────────────────────────────────
  async publishAssignment(id: string, actor: User) {
    const a = await this.assignmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    const scope = await this.staffScope(actor);
    if (!canManageOwnedWork(scope, actor, a.teacherId)) throw new ForbiddenException();

    if (a.type === 'QUIZ') {
      const questions = await this.questionsRepo.find({ where: { assignmentId: id } });
      if (questions.length === 0) {
        throw new BadRequestException('A quiz must have at least one question before it can be published');
      }
      const missingAnswers = questions.some(q => q.type === 'MULTIPLE_CHOICE' && !q.correctAnswer);
      if (missingAnswers) {
        throw new BadRequestException('Cannot publish: All multiple-choice questions must have a correct answer assigned');
      }
    }

    await this.assignmentsRepo.update(id, { isPublished: true });
    return { message: 'Published successfully' };
  }

  // ─── TEACHER: delete assignment ────────────────────────────────────────────
  async deleteAssignment(id: string, actor: User) {
    const a = await this.assignmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    const scope = await this.staffScope(actor);
    if (!canManageOwnedWork(scope, actor, a.teacherId)) throw new ForbiddenException();
    await this.assignmentsRepo.delete(id);
    return { message: 'Deleted' };
  }

  // ─── TEACHER/ADMIN: update assignment ──────────────────────────────────────
  async updateAssignment(id: string, dto: any, actor: User) {
    const a = await this.assignmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    const scope = await this.staffScope(actor);
    if (!canManageOwnedWork(scope, actor, a.teacherId)) throw new ForbiddenException();

    if (dto.title !== undefined) a.title = dto.title.trim();
    if (dto.description !== undefined) a.description = dto.description?.trim() || null;
    if (dto.dueDate !== undefined) a.dueDate = dto.dueDate ? new Date(dto.dueDate) : (null as any);
    if (dto.maxGrade !== undefined) a.maxGrade = Number(dto.maxGrade) || 100;
    if (dto.chapterName !== undefined) a.chapterName = dto.chapterName?.trim() || null;
    if (dto.lessonName !== undefined) a.lessonName = dto.lessonName?.trim() || null;
    if (dto.contentOrder !== undefined) a.contentOrder = Number.isFinite(Number(dto.contentOrder)) ? Number(dto.contentOrder) : 0;
    if (dto.unlockRule !== undefined) a.unlockRule = dto.unlockRule || UnlockRuleType.NONE;
    if (dto.unlockAssignmentId !== undefined) a.unlockAssignmentId = dto.unlockAssignmentId || null;
    if (dto.unlockScore !== undefined) a.unlockScore = dto.unlockScore ?? null;
    if (dto.unlockVideoId !== undefined) a.unlockVideoId = dto.unlockVideoId || null;
    if (dto.unlockPercent !== undefined) a.unlockPercent = dto.unlockPercent ?? null;
    if (dto.attachments !== undefined) a.attachments = dto.attachments;
    if (dto.isPublished !== undefined) a.isPublished = Boolean(dto.isPublished);

    return this.assignmentsRepo.save(a);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  QUIZ QUESTIONS CRUD
  // ══════════════════════════════════════════════════════════════════════════

  async getQuestions(assignmentId: string, actor?: User, studentId?: string) {
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor && actor.role !== UserRole.STUDENT) {
      const scope = await this.assertCanManageGroup(assignment.courseName, assignment.groupName, actor);
      if (!assignment.isPublished && !canManageOwnedWork(scope, actor, assignment.teacherId)) {
        throw new ForbiddenException();
      }
    }
    if (studentId) await this.assertAssignmentUnlocked(assignmentId, studentId);
    return this.questionsRepo.find({
      where: { assignmentId },
      order: { orderIndex: 'ASC' },
    });
  }

  async createQuestion(assignmentId: string, dto: {
    questionText: string;
    questionImageUrl?: string;
    type: QuizQuestionType;
    options?: QuizOption[];
    correctAnswer?: string;
    points?: number;
  }, actor: User) {
    const assignment = await this.assertCanManageAssignment(assignmentId, actor);
    if (assignment.type !== AssignmentType.QUIZ) throw new BadRequestException('Questions can only be added to quizzes');
    if (assignment.isPublished && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Published quizzes cannot be edited');
    }
    const count = await this.questionsRepo.count({ where: { assignmentId } });
    const q = this.questionsRepo.create({
      ...dto,
      assignmentId,
      orderIndex: count,
      points: dto.points ?? 1,
    });
    return this.questionsRepo.save(q);
  }

  async updateQuestion(assignmentId: string, id: string, dto: Partial<{
    questionText: string;
    questionImageUrl: string;
    type: QuizQuestionType;
    options: QuizOption[];
    correctAnswer: string;
    points: number;
    orderIndex: number;
  }>, actor: User) {
    const assignment = await this.assertCanManageAssignment(assignmentId, actor);
    if (assignment.type !== AssignmentType.QUIZ) throw new BadRequestException('Questions can only be edited on quizzes');
    if (assignment.isPublished && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Published quizzes cannot be edited');
    }
    const q = await this.questionsRepo.findOne({ where: { id, assignmentId } });
    if (!q) throw new NotFoundException('Question not found');
    await this.questionsRepo.update(id, dto);
    return this.questionsRepo.findOne({ where: { id } });
  }

  async deleteQuestion(assignmentId: string, id: string, actor: User) {
    const assignment = await this.assertCanManageAssignment(assignmentId, actor);
    if (assignment.type !== AssignmentType.QUIZ) throw new BadRequestException('Questions can only be deleted from quizzes');
    if (assignment.isPublished && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Published quizzes cannot be edited');
    }
    const question = await this.questionsRepo.findOne({ where: { id, assignmentId } });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionsRepo.delete({ id, assignmentId });
    return { message: 'Deleted' };
  }

  async reorderQuestions(assignmentId: string, orderedIds: string[], actor: User) {
    const assignment = await this.assertCanManageAssignment(assignmentId, actor);
    if (assignment.type !== AssignmentType.QUIZ) throw new BadRequestException('Questions can only be reordered on quizzes');
    if (assignment.isPublished && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Published quizzes cannot be edited');
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new BadRequestException('Question order contains duplicate IDs');
    }
    const questions = await this.questionsRepo.find({ where: { assignmentId } });
    if (orderedIds.length !== questions.length || orderedIds.some(id => !questions.some(question => question.id === id))) {
      throw new BadRequestException('Question order must include every question in this quiz');
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await this.questionsRepo.update(
        { id: orderedIds[i], assignmentId },
        { orderIndex: i },
      );
    }
    return this.getQuestions(assignmentId, actor);
  }
}
