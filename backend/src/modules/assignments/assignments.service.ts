import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment, AssignmentType } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { QuizQuestion, QuizQuestionType, QuizOption } from './entities/quiz-question.entity';
import { CourseEnrollment } from '../subscriptions/entities/course-enrollment.entity';
import { User } from '../users/entities/user.entity';

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
  ) {}

  // ─── TEACHER: get courses for their specialization ────────────────────────
  async getTeacherCourses(teacher: User): Promise<string[]> {
    return teacher.subjects || [];
  }

  // ─── TEACHER: get distinct groups for a course ────────────────────────────
  async getGroupsForCourse(courseName: string): Promise<string[]> {
    const rows = await this.enrollmentsRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.groupName', 'groupName')
      .where('e.courseName = :courseName', { courseName })
      .andWhere('e.groupName IS NOT NULL')
      .getRawMany();
    return rows.map((r) => r.groupName).filter(Boolean);
  }

  // ─── TEACHER: get students enrolled in a specific group ───────────────────
  async getStudentsInGroup(courseName: string, groupName: string) {
    const enrollments = await this.enrollmentsRepo.find({
      where: { courseName, groupName },
      relations: ['student'],
    });
    return enrollments.map((e) => ({
      id: e.studentId,
      name: e.student?.name,
      email: e.student?.email,
    }));
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
  }, teacher: User): Promise<Assignment> {
    const assignment = this.assignmentsRepo.create({
      ...dto,
      maxGrade: dto.maxGrade ?? 100,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      teacherId: teacher.id,
    });
    return this.assignmentsRepo.save(assignment);
  }

  // ─── GET assignments for a group ──────────────────────────────────────────
  async getAssignments(courseName: string, groupName: string, type?: AssignmentType) {
    const qb = this.assignmentsRepo
      .createQueryBuilder('a')
      .where('a.courseName = :courseName', { courseName })
      .andWhere('a.groupName = :groupName', { groupName })
      .orderBy('a.createdAt', 'DESC');

    if (type) qb.andWhere('a.type = :type', { type });
    return qb.getMany();
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
      return {
        student,
        submitted: !!submission,
        submission: submission || null,
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
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

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
    const assignment = await this.assignmentsRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Quiz not found');

    const questions = await this.questionsRepo.find({
      where: { assignmentId },
      order: { orderIndex: 'ASC' },
    });

    // Auto-grade
    let earnedPoints = 0;
    let totalPoints = 0;
    for (const q of questions) {
      totalPoints += q.points;
      if (q.correctAnswer && answers[q.id] !== undefined) {
        const studentAns = answers[q.id].trim().toLowerCase();
        const correct = q.correctAnswer.trim().toLowerCase();
        if (studentAns === correct) earnedPoints += q.points;
      }
    }

    // Convert to grade out of maxGrade
    const grade = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * assignment.maxGrade)
      : 0;

    const content = JSON.stringify(answers); // store answers as JSON string

    const existing = await this.submissionsRepo.findOne({
      where: { assignmentId, studentId: student.id },
    });

    if (existing) {
      await this.submissionsRepo.update(existing.id, { content, grade });
      return this.submissionsRepo.findOne({ where: { id: existing.id } });
    }

    return this.submissionsRepo.save(
      this.submissionsRepo.create({ assignmentId, studentId: student.id, content, grade }),
    );
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

  // ─── STUDENT: get their assignments for a course/group ────────────────────
  async getStudentAssignments(studentId: string, courseName: string, groupName: string) {
    const assignments = await this.getAssignments(courseName, groupName);
    const submissions = await this.submissionsRepo.find({
      where: { studentId },
    });
    const subMap = new Map(submissions.map((s) => [s.assignmentId, s]));
    return assignments.map((a) => ({
      ...a,
      submission: subMap.get(a.id) || null,
    }));
  }

  // ─── TEACHER: delete assignment ────────────────────────────────────────────
  async deleteAssignment(id: string, teacherId: string) {
    const a = await this.assignmentsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    if (a.teacherId !== teacherId) throw new ForbiddenException();
    await this.assignmentsRepo.delete(id);
    return { message: 'Deleted' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  QUIZ QUESTIONS CRUD
  // ══════════════════════════════════════════════════════════════════════════

  async getQuestions(assignmentId: string) {
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
  }) {
    const count = await this.questionsRepo.count({ where: { assignmentId } });
    const q = this.questionsRepo.create({
      ...dto,
      assignmentId,
      orderIndex: count,
      points: dto.points ?? 1,
    });
    return this.questionsRepo.save(q);
  }

  async updateQuestion(id: string, dto: Partial<{
    questionText: string;
    questionImageUrl: string;
    type: QuizQuestionType;
    options: QuizOption[];
    correctAnswer: string;
    points: number;
    orderIndex: number;
  }>) {
    const q = await this.questionsRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    await this.questionsRepo.update(id, dto);
    return this.questionsRepo.findOne({ where: { id } });
  }

  async deleteQuestion(id: string) {
    await this.questionsRepo.delete(id);
    return { message: 'Deleted' };
  }

  async reorderQuestions(assignmentId: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.questionsRepo.update(
        { id: orderedIds[i], assignmentId },
        { orderIndex: i },
      );
    }
    return this.getQuestions(assignmentId);
  }
}
